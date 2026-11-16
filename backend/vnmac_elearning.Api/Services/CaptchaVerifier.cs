using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class CaptchaVerifier(HttpClient httpClient, IOptions<CaptchaOptions> options)
{
    private sealed record TurnstileResponse(bool Success, string[]? ErrorCodes);

    public async Task<bool> VerifyAsync(string? token, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(settings.SecretKey) || string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["secret"] = settings.SecretKey,
            ["response"] = token
        });
        using var response = await httpClient.PostAsync(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            content,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return false;
        }

        var payload = await response.Content.ReadFromJsonAsync<TurnstileResponse>(cancellationToken: cancellationToken);
        return payload?.Success == true;
    }
}
