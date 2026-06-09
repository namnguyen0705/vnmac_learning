using System.Text.Json;
using System.Text.Json.Serialization;

namespace vnmac_elearning.Api.Infrastructure;

public static class JsonStorage
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static string Serialize<T>(T value)
    {
        return JsonSerializer.Serialize(value, Options);
    }

    public static T? Deserialize<T>(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(json, Options);
    }

    public static T? Clone<T>(T? value)
    {
        return value is null ? default : Deserialize<T>(Serialize(value));
    }
}
