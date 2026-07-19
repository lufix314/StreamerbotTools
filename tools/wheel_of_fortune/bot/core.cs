using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using Newtonsoft.Json;

public class CPHInline
{
    private const int SPIN_DURATION = 5;

    private const string ENTRIES_VAR_NAME = "wofEntries";

    private const string SPIN_WHEEL_EVENT = "SpinTheWheel";
    private const string WHEEL_RESULT_EVENT = "WheelResult";

    private Random rnd = new Random();

    public void Init()
    {
        string[] categories = {"Wheel of Fortune"};
        CPH.RegisterCustomTrigger("Spin the Wheel", SPIN_WHEEL_EVENT, categories);
        CPH.RegisterCustomTrigger("Wheel of Fortune Result", WHEEL_RESULT_EVENT, categories);
    }

    public bool AddEntry()
    {
        var args = GetArgs();

        if (args.Count() > 2) {
            SendMessage("Too many arguments! Expected two arguments");
            return false;
        }
        if (args.Count() < 2) {
            SendMessage("Missing argument! Expected two arguments");
            return false;
        }

        string name = args[0];

        int multiplier;
        try
        {
            multiplier = Int32.Parse(args[1]);
        }
        catch
        {
            SendMessage("Invalid Argument! Second argument must be a number");
            return false;
        }

        var entries = GetEntries();
        entries.Add(new Entry { name=name, multiplier=multiplier});

        SaveEntries(entries);

        var probs = MultiplierToProbabilities(entries);
        SendMessage($"Added {name} to the Wheel with a probability of {(probs.Last() * 100)}%");

        return true;
    }

    public bool RemoveEntry()
    {
        var args = GetArgs();

        if (args.Count() > 1) {
            SendMessage("Too many arguments! Expected one argument");
            return false;
        }
        if (args.Count() < 1) {
            SendMessage("Missing argument! Expected one argument");
            return false;
        }

        var entries = GetEntries();
        var idx = entries.FindIndex((e) => e.name == args[0]);

        if (idx < 0) {
            SendMessage("Could not find entry!");
            return true;
        }

        entries.RemoveAt(idx);
        SendMessage($"Removed {args[0]} from the Wheel");

        SaveEntries(entries);

        return true;
    }

    public bool SpinWheel()
    {
        var entries = GetEntries();
        var idx = PickRandEntry(entries);

        var payload = new Dictionary<string, object>
        {
            { "idx", idx },
            { "name", entries[idx].name },
            { "time",  SPIN_DURATION }
        };
        CPH.TriggerCodeEvent(SPIN_WHEEL_EVENT, payload);

        Thread.Sleep(SPIN_DURATION * 1000);

        CPH.TriggerCodeEvent(WHEEL_RESULT_EVENT, payload);

        SendMessage($"Result: {entries[idx].name}");
        return true;
    }

    private int PickRandEntry(List<Entry> entries)
    {
        return PickRandEntry(MultiplierToProbabilities(entries));
    }

    private int PickRandEntry(List<float> entries)
    {
        float aggregatedP = 0;
        var aggregated = entries.ConvertAll(p => {
            aggregatedP += p; 
            return aggregatedP;
        });

        var pickedP = rnd.NextDouble();
        var selected = aggregated.Count() - aggregated.SkipWhile(p => p < pickedP).Count();

        return selected;
    }

    private List<float> MultiplierToProbabilities(List<Entry> entries)
    {
        int total = 0;
        foreach (Entry entry in entries)
        {
            total += entry.multiplier;
        }

        return entries.ConvertAll<float>(entry => (float)entry.multiplier / total);
    }

    private int GetNumArg() => GetNumArg(1);

    // Get numeric argument, return default if missing or invalid
    private int GetNumArg(int def)
    {
        string num_arg;
        if (!CPH.TryGetArg("input0", out num_arg) || string.IsNullOrWhiteSpace(num_arg))
        {
            return def;
        }
        else
        {
            try
            {
                return Int32.Parse(num_arg);
            }
            catch
            {
                return def;
            }
        }
    }

    // Parse rawArgs with bash-style quote handling
    private List<string> GetArgs()
    {
        if (!CPH.TryGetArg("rawInput", out string rawArgs) || string.IsNullOrWhiteSpace(rawArgs))
        {
            return new List<string>();
        }

        char[] quotes = {'"', '\''};
        var matches = System.Text.RegularExpressions.Regex.Matches(rawArgs, @"(?<q>[""'])(?:(?!\1).)*\1|\S+")
            .Cast<System.Text.RegularExpressions.Match>()
            .Select(m => m.Value.Trim(quotes))
            .ToList();

        return matches;
    }

    private List<Entry> GetEntries()
    {
        string entriesJson = CPH.GetGlobalVar<string>(ENTRIES_VAR_NAME, true);

        if (string.IsNullOrWhiteSpace(entriesJson)) { return new List<Entry>(); }

        return JsonConvert.DeserializeObject<List<Entry>>(entriesJson)
               ?? new List<Entry>();
    }


    private void SaveEntries(List<Entry> entries)
    {
        string entriesJson = JsonConvert.SerializeObject(entries);
        CPH.SetGlobalVar(ENTRIES_VAR_NAME, entriesJson, true);
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

    public class Entry
    {
        public string name { get; set; }
        public int multiplier { get; set; }
    }

}
