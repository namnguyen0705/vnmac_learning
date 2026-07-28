namespace vnmac_elearning.Api.Domain;

public sealed class Province
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Tỉnh";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
