using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using Newtonsoft.Json;

public class CPHInline
{
    private const string QUOTES_VAR_NAME = "quotes";

    private const string RAND_QUOTE_EVENT = "RandomQuoteSelected";

    private const string ADD_COMMAND_USAGE = "!addQuote \"This is a Quote\" Henry MyFunnyClipIdOrLink";

    public void Init()
    {
        string[] categories = {"Quotes"};
        CPH.RegisterCustomTrigger("Random Quote Selected", RAND_QUOTE_EVENT, categories);
    }

    public bool AddQuote()
    {
        try
        {
            string input = GetArg("rawInput");
            string[] subs = input.Split('"');

            if (subs.Count() < 3) {
                SendMessage($"Invalid arguments. To add a quote write '{ADD_COMMAND_USAGE}'.");
                return false;
            }

            string quote = subs[1];
            string[] args = subs[2].Trim().Split(' ');

            if (args.Count() < 1 || args[0] == "") {
                SendMessage($"Quote author missing. To add a quote write '{ADD_COMMAND_USAGE}'.");
                return false;
            }

            if (args.Count() > 2) {
                SendMessage($"To many arguments. To add a quote write '{ADD_COMMAND_USAGE}'.");
                return false;
            }

            string author = args[0];

            string twitchClipId = null;
            if (args.Count() == 2) {
                var pattern = @"^(?:https?://)?(?:www\.)?twitch\.tv/[^/]+/clip/([A-Za-z0-9_-]+)(?:\?.*)?$|^([A-Za-z0-9_-]+)$";
                var match = Regex.Match(args[1], pattern);
                twitchClipId = match.Success ? (match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value) : null;
            }

            var quotes = GetQuotes();
            var newQuote = new Quote
            {
                quote = quote,
                author = author,
                twitchClipId = twitchClipId
            };
            quotes.Add(newQuote);
            SaveQuotes(quotes);

            SendMessage($"Quote added! Total quotes: {quotes.Count}");
        }
        catch (Exception err)
        {
            SendMessage($"Failed to add quote: {err.Message}");
            return false;
        }

        return true;
    }

    public bool RemoveQuote()
    {
        try
        {
            int index = GetNumArg("input0");
            var quotes = GetQuotes();

            if (index < 0 || index >= quotes.Count)
            {
                SendMessage($"Invalid index! Quote list has {quotes.Count} entries (0-{quotes.Count - 1}).");
                return false;
            }

            var removedQuote = quotes[index];
            quotes.RemoveAt(index);
            SaveQuotes(quotes);

            var sb = new StringBuilder();
            sb.Append($"Removed quote: \"{removedQuote.quote}\" by {removedQuote.author}");
            if (!string.IsNullOrEmpty(removedQuote.twitchClipId)) {
                sb.Append($" [Clip: {removedQuote.twitchClipId}]");
            }

            SendMessage(sb.ToString());
        }
        catch (Exception err)
        {
            SendMessage($"Failed to remove quote: {err.Message}");
            return false;
        }

        return true;
    }

    public bool PickRandomQuote()
    {
        try
        {
            var quotes = GetQuotes();

            if (quotes.Count == 0)
            {
                SendMessage("No quotes available!");
                return false;
            }

            var random = new Random();
            var selectedQuote = quotes[random.Next(quotes.Count)];

            var payload = new Dictionary<string, object>
            {
                { "quote", selectedQuote.quote },
                { "author", selectedQuote.author },
                { "twitchClipId", string.IsNullOrEmpty(selectedQuote.twitchClipId) ? null : selectedQuote.twitchClipId }
            };

            CPH.TriggerCodeEvent(RAND_QUOTE_EVENT, payload);
            SendMessage($"\"{selectedQuote.quote}\" ~ {selectedQuote.author}");
        }
        catch (Exception err)
        {
            SendMessage($"Failed to pick random quote: {err.Message}");
            return false;
        }

        return true;
    }

    public bool ClearQuotes()
    {
        try
        {
            var quotes = GetQuotes();
            int count = quotes.Count;
            quotes.Clear();
            SaveQuotes(quotes);

            SendMessage($"Cleared {count} quotes!");
        }
        catch (Exception err)
        {
            SendMessage($"Failed to clear quotes: {err.Message}");
            return false;
        }

        return true;
    }

    private string GetArg(string arg)
    {
        if (!CPH.TryGetArg(arg, out string value) || string.IsNullOrWhiteSpace(value))
        {
            throw new Exception($"Missing argument: {arg}");
        }
        return value;
    }

    private int GetNumArg(string arg)
    {
        string num_arg;
        if (!CPH.TryGetArg(arg, out num_arg) || string.IsNullOrWhiteSpace(num_arg))
        {
            throw new Exception($"Missing or invalid number argument: {arg}");
        }
        else
        {
            try
            {
                return Int32.Parse(num_arg);
            }
            catch
            {
                throw new Exception($"Invalid number argument: {arg}");
            }
        }
    }

    private List<Quote> GetQuotes()
    {
        string quotesJson = CPH.GetGlobalVar<string>(QUOTES_VAR_NAME, true);

        if (string.IsNullOrWhiteSpace(quotesJson)) { return new List<Quote>(); }

        return JsonConvert.DeserializeObject<List<Quote>>(quotesJson)
               ?? new List<Quote>();
    }

    private void SaveQuotes(List<Quote> quotes)
    {
        string quotesJson = JsonConvert.SerializeObject(quotes);
        CPH.SetGlobalVar(QUOTES_VAR_NAME, quotesJson, true);
    }

    private void SendMessage(string msg)
    {
        if (!isSilent())
        {
            CPH.SendMessage(msg, true, true);
        }
    }

    // Check if silent flag is set (skip chat messages)
    private bool isSilent()
    {
        if (!CPH.TryGetArg<bool>("silent", out bool silent)) {
            return false;
        }

        return silent;
    }

    public class Quote
    {
        public string quote { get; set; }
        public string author { get; set; }
        public string twitchClipId { get; set; }
    }
}
