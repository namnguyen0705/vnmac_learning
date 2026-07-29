using System.IO.Compression;
using System.Xml.Linq;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class ScormPackageImportService(
    IWebHostEnvironment environment,
    TrainingDbContext dbContext)
{
    private const long MaxArchiveBytes = 512L * 1024 * 1024;
    private const long MaxExtractedBytes = 2L * 1024 * 1024 * 1024;
    private const int MaxEntries = 20_000;

    public async Task<ScormPackageRequest> ImportAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length <= 0 || file.Length > MaxArchiveBytes ||
            !string.Equals(Path.GetExtension(file.FileName), ".zip", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Gói SCORM phải là file ZIP và không vượt quá 512 MB.");
        }

        var packageToken = Guid.NewGuid().ToString("N");
        var relativeRoot = Path.Combine("scorm", "packages", packageToken);
        var targetRoot = Path.Combine(GetWebRoot(), relativeRoot);
        Directory.CreateDirectory(targetRoot);

        try
        {
            await using var uploadStream = file.OpenReadStream();
            using var archive = new ZipArchive(uploadStream, ZipArchiveMode.Read, leaveOpen: false);
            if (archive.Entries.Count == 0 || archive.Entries.Count > MaxEntries)
            {
                throw new InvalidOperationException("Gói SCORM rỗng hoặc chứa quá nhiều file.");
            }

            var targetRootFull = Path.GetFullPath(targetRoot) + Path.DirectorySeparatorChar;
            long extractedBytes = 0;

            foreach (var entry in archive.Entries)
            {
                cancellationToken.ThrowIfCancellationRequested();
                extractedBytes += entry.Length;
                if (extractedBytes > MaxExtractedBytes)
                {
                    throw new InvalidOperationException("Dung lượng giải nén của gói SCORM vượt quá 2 GB.");
                }

                var normalizedName = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                var destination = Path.GetFullPath(Path.Combine(targetRoot, normalizedName));
                if (!destination.StartsWith(targetRootFull, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Gói SCORM chứa đường dẫn file không an toàn.");
                }

                if (string.IsNullOrEmpty(entry.Name))
                {
                    Directory.CreateDirectory(destination);
                    continue;
                }

                Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
                await using var source = entry.Open();
                await using var output = new FileStream(destination, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
                await source.CopyToAsync(output, cancellationToken);
            }

            var manifestPath = Directory
                .EnumerateFiles(targetRoot, "imsmanifest.xml", SearchOption.AllDirectories)
                .OrderBy(path => path.Count(character => character is '\\' or '/'))
                .FirstOrDefault()
                ?? throw new InvalidOperationException("Không tìm thấy imsmanifest.xml trong gói SCORM.");

            return ParseManifest(manifestPath, targetRoot, relativeRoot.Replace('\\', '/'), packageToken);
        }
        catch (OperationCanceledException)
        {
            CleanupDirectory(targetRoot);
            throw;
        }
        catch (InvalidOperationException)
        {
            CleanupDirectory(targetRoot);
            throw;
        }
        catch (Exception exception)
        {
            CleanupDirectory(targetRoot);
            throw new InvalidOperationException("Không thể giải nén hoặc đọc gói SCORM.", exception);
        }
    }

    public bool DeleteUnreferencedPackage(string entryPath)
    {
        if (string.IsNullOrWhiteSpace(entryPath))
        {
            throw new InvalidOperationException("Đường dẫn gói SCORM không hợp lệ.");
        }

        var normalizedPath = entryPath.Trim().TrimStart('/').Replace('\\', '/');
        var segments = normalizedPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length < 4 ||
            !string.Equals(segments[0], "scorm", StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(segments[1], "packages", StringComparison.OrdinalIgnoreCase) ||
            segments[2].Length != 32 ||
            segments[2].Any(character => !Uri.IsHexDigit(character)))
        {
            throw new InvalidOperationException("Đường dẫn gói SCORM không hợp lệ.");
        }

        var packageRoot = $"scorm/packages/{segments[2]}/";
        var isReferenced = dbContext.ScormPackages.Any(item => item.EntryPath.StartsWith(packageRoot)) ||
            dbContext.ScormScos.Any(item => item.LaunchPath.StartsWith(packageRoot));
        if (isReferenced)
        {
            return false;
        }

        var webRoot = Path.GetFullPath(GetWebRoot());
        var targetRoot = Path.GetFullPath(Path.Combine(webRoot, "scorm", "packages", segments[2]));
        if (!targetRoot.StartsWith(webRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Đường dẫn gói SCORM không an toàn.");
        }

        if (!Directory.Exists(targetRoot))
        {
            return false;
        }

        Directory.Delete(targetRoot, recursive: true);
        return true;
    }

    private static ScormPackageRequest ParseManifest(
        string manifestPath,
        string targetRoot,
        string publicRoot,
        string packageToken)
    {
        XDocument document;
        try
        {
            document = XDocument.Load(manifestPath, LoadOptions.None);
        }
        catch (Exception exception) when (exception is System.Xml.XmlException or IOException)
        {
            throw new InvalidOperationException("File imsmanifest.xml không hợp lệ.", exception);
        }

        var manifest = document.Root ?? throw new InvalidOperationException("Manifest SCORM không có nội dung.");
        var metadata = manifest.Descendants().FirstOrDefault(element => element.Name.LocalName == "metadata");
        var schemaVersion = metadata?.Descendants().FirstOrDefault(element => element.Name.LocalName == "schemaversion")?.Value.Trim();
        var version = DetectVersion(manifest, schemaVersion);
        var manifestDirectory = Path.GetDirectoryName(manifestPath)!;

        var resources = manifest.Descendants()
            .Where(element => element.Name.LocalName == "resource")
            .Select(element => new
            {
                Identifier = Attribute(element, "identifier"),
                Href = Attribute(element, "href"),
                ScormType = element.Attributes().FirstOrDefault(attribute => attribute.Name.LocalName == "scormtype")?.Value
            })
            .Where(resource => !string.IsNullOrWhiteSpace(resource.Identifier) && !string.IsNullOrWhiteSpace(resource.Href))
            .GroupBy(resource => resource.Identifier!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);

        var organization = manifest.Descendants().FirstOrDefault(element => element.Name.LocalName == "organization");
        var packageTitle = organization?.Elements().FirstOrDefault(element => element.Name.LocalName == "title")?.Value.Trim();
        var items = organization?.Descendants()
            .Where(element => element.Name.LocalName == "item" && !string.IsNullOrWhiteSpace(Attribute(element, "identifierref")))
            .ToArray() ?? [];

        var scos = new List<ScormScoRequest>();
        var order = 1;
        foreach (var item in items)
        {
            var resourceId = Attribute(item, "identifierref")!;
            if (!resources.TryGetValue(resourceId, out var resource))
            {
                continue;
            }

            var launchPath = BuildLaunchPath(resource.Href!, manifestDirectory, targetRoot, publicRoot);
            EnsureLaunchFileExists(launchPath, targetRoot);
            var itemIdentifier = Attribute(item, "identifier") ?? resourceId;
            scos.Add(new ScormScoRequest
            {
                Id = BuildScoId(packageToken, itemIdentifier, order),
                Identifier = itemIdentifier,
                Title = item.Elements().FirstOrDefault(element => element.Name.LocalName == "title")?.Value.Trim()
                    ?? resourceId,
                LaunchPath = launchPath,
                ItemType = string.Equals(resource.ScormType, "asset", StringComparison.OrdinalIgnoreCase)
                    ? ScormScoType.Asset
                    : ScormScoType.Sco,
                Order = order++,
                MasteryScore = ParseMasteryScore(item)
            });
        }

        if (scos.Count == 0)
        {
            foreach (var resource in resources.Values.Where(resource =>
                         !string.Equals(resource.ScormType, "asset", StringComparison.OrdinalIgnoreCase)))
            {
                var launchPath = BuildLaunchPath(resource.Href!, manifestDirectory, targetRoot, publicRoot);
                EnsureLaunchFileExists(launchPath, targetRoot);
                scos.Add(new ScormScoRequest
                {
                    Id = BuildScoId(packageToken, resource.Identifier!, order),
                    Identifier = resource.Identifier!,
                    Title = resource.Identifier!,
                    LaunchPath = launchPath,
                    ItemType = ScormScoType.Sco,
                    Order = order++
                });
            }
        }

        if (scos.Count == 0)
        {
            throw new InvalidOperationException("Manifest không chứa SCO có thể khởi chạy.");
        }

        var identifier = Attribute(manifest, "identifier") ?? $"scorm-{packageToken[..12]}";
        return new ScormPackageRequest
        {
            Version = version,
            Identifier = identifier,
            Title = string.IsNullOrWhiteSpace(packageTitle) ? identifier : packageTitle,
            EntryPath = scos[0].LaunchPath,
            LaunchScoId = scos[0].Id,
            ManifestVersion = schemaVersion,
            Scos = scos
        };
    }

    private static string BuildLaunchPath(string href, string manifestDirectory, string targetRoot, string publicRoot)
    {
        var cleanHref = Uri.UnescapeDataString(href.Split('?', '#')[0]).Replace('/', Path.DirectorySeparatorChar);
        var absolutePath = Path.GetFullPath(Path.Combine(manifestDirectory, cleanHref));
        var targetRootFull = Path.GetFullPath(targetRoot) + Path.DirectorySeparatorChar;
        if (!absolutePath.StartsWith(targetRootFull, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Manifest chứa đường dẫn khởi chạy không an toàn.");
        }

        var relative = Path.GetRelativePath(targetRoot, absolutePath).Replace('\\', '/');
        return $"{publicRoot}/{relative}";
    }

    private static void EnsureLaunchFileExists(string launchPath, string targetRoot)
    {
        var packageToken = Path.GetFileName(targetRoot);
        var prefix = $"scorm/packages/{packageToken}/";
        var pathAfterPackage = launchPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? launchPath[prefix.Length..]
            : string.Empty;
        if (string.IsNullOrWhiteSpace(pathAfterPackage) ||
            !File.Exists(Path.Combine(targetRoot, pathAfterPackage.Replace('/', Path.DirectorySeparatorChar))))
        {
            throw new InvalidOperationException($"Không tìm thấy file khởi chạy '{launchPath}'.");
        }
    }

    private static ScormVersion DetectVersion(XElement manifest, string? schemaVersion)
    {
        if (schemaVersion?.Contains("2004", StringComparison.OrdinalIgnoreCase) == true ||
            manifest.Descendants().Any(element => element.Name.NamespaceName.Contains("adlcp_v1p3", StringComparison.OrdinalIgnoreCase)))
        {
            return ScormVersion.Scorm2004;
        }

        return ScormVersion.Scorm12;
    }

    private static int? ParseMasteryScore(XElement item)
    {
        var value = item.Descendants().FirstOrDefault(element => element.Name.LocalName == "masteryscore")?.Value;
        return int.TryParse(value, out var score) ? score : null;
    }

    private static string? Attribute(XElement element, string name) =>
        element.Attributes().FirstOrDefault(attribute => attribute.Name.LocalName == name)?.Value.Trim();

    private static string BuildScoId(string packageToken, string identifier, int order)
    {
        var safeIdentifier = new string(identifier.Where(char.IsLetterOrDigit).Take(16).ToArray()).ToLowerInvariant();
        var id = $"sco-{packageToken[..8]}-{order}-{safeIdentifier}";
        return id[..Math.Min(40, id.Length)];
    }

    private string GetWebRoot()
    {
        if (!string.IsNullOrWhiteSpace(environment.WebRootPath))
        {
            return environment.WebRootPath;
        }

        var webRoot = Path.Combine(environment.ContentRootPath, "wwwroot");
        Directory.CreateDirectory(webRoot);
        return webRoot;
    }

    private static void CleanupDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch
        {
            // Preserve the original import error; abandoned imports can be cleaned administratively.
        }
    }
}
