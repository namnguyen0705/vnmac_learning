using System.Security;
using System.Text;

namespace vnmac_elearning.Api.Services;

public static class PartTwoCertificateTemplate
{
    public const string Version = "part2-provisional-v1";
    private static readonly Lazy<string> Template = new(() => {
        using var stream = typeof(PartTwoCertificateTemplate).Assembly.GetManifestResourceStream("vnmac_elearning.Api.Content.part2-certificate.svg")!;
        using var reader = new StreamReader(stream); return reader.ReadToEnd();
    });
    public static string Render(string name, string address, string id, DateTimeOffset date)
    {
        string Escape(string s) => SecurityElement.Escape(s) ?? "";
        IEnumerable<string> Wrap(string s, int max) {
            var line = "";
            foreach (var word in s.Split(' ',StringSplitOptions.RemoveEmptyEntries)) {
                if (line.Length>0 && line.Length+word.Length+1>max) { yield return line; line=""; }
                if (word.Length>max) { if(line.Length>0){yield return line;line="";} for(var i=0;i<word.Length;i+=max)yield return word.Substring(i,Math.Min(max,word.Length-i)); }
                else line += (line.Length>0 ? " " : "")+word;
            }
            if(line.Length>0)yield return line;
        }
        var names=Wrap(name,60).ToArray(); var nameFont=name.Length>60?28:name.Length>36?34:42;
        var nameLines=string.Join("",names.Select((line,i)=>$"<text x=\"561.5\" y=\"{(names.Length>1?314+i*36:330)}\" font-size=\"{nameFont}\" font-weight=\"700\">{Escape(line)}</text>"));
        var addresses=Wrap(address,88).ToArray();
        var addressLines=string.Join("",addresses.Select((line,i)=>$"<text x=\"561.5\" y=\"{383+i*22}\" font-size=\"16\" fill=\"#526c70\">{Escape(line)}</text>"));
        return Template.Value.Replace("{{NAME}}",Escape(name)).Replace("{{NAME_LINES}}",nameLines).Replace("{{ADDRESS_LINES}}",addressLines).Replace("{{DATE}}",date.ToOffset(TimeSpan.FromHours(7)).ToString("dd/MM/yyyy")).Replace("{{ID}}",Escape(id));
    }
}
