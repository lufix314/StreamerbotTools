using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

public class CPHInline
{
    private enum LimitType
    {
        All = -1,  // Show entire queue
        Live = -2  // Show only live players
    }

    private const string QUEUE_VAR_NAME = "viewerQueue";
    private const string VIEWER_LIVE_VAR_NAME = "viewerLive";
    private const string STATE_VAR_NAME = "viewerQueueOpen";
    private const string MSG_VAR_NAME = "viewerQueueMsg";

    private bool isOpen
    {
        get { return CPH.GetGlobalVar<bool>(STATE_VAR_NAME, true); }
        set { CPH.SetGlobalVar(STATE_VAR_NAME, value, true); }
    }

    private int numLive
    {
        get { return CPH.GetGlobalVar<int>(VIEWER_LIVE_VAR_NAME, true); }
        set { CPH.SetGlobalVar(VIEWER_LIVE_VAR_NAME, value, true); }
    }

    private string queueMessage
    {
        get { return CPH.GetGlobalVar<string>(MSG_VAR_NAME, true); }
        set { CPH.SetGlobalVar(MSG_VAR_NAME, value, true); }
    }

    public bool AddPlayerToQueue()
    {
        if (!isOpen)
        {
            SendMessage("The queue is closed.");
            return true;
        }

        try
        {
            var name = GetViewerName();
            var queue = GetQueue();
            var player = queue.FirstOrDefault(p => p.name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (player == null)
            {
                player = new Player
                {
                    name = name,
                    live = false
                };
                queue.Add(player);
                queue = FixQueue(queue);
                SaveQueue(queue);
                SendMessage($"@{name} was added to the queue in position {queue.Count}.");
            }
            else
            {
                SendMessage($"@{name} is already in the queue. Their current position is #{queue.IndexOf(player) + 1} of {queue.Count}.");
            }
        }
        catch (Exception err)
        {
            SendMessage(err.Message);
        }

        return true;
    }

    public bool RemovePlayerFromQueue()
    {
        if (!isOpen)
        {
            SendMessage("The queue is closed.");
            return true;
        }

        try
        {
            var name = GetViewerName();
            var queue = GetQueue();
            var player = queue.FirstOrDefault(p => p.name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (player != null)
            {
                queue.Remove(player);
                queue = FixQueue(queue);
                SaveQueue(queue);
                SendMessage($"@{name} was removed from the queue.");
            }
            else
            {
                SendMessage($"@{name} is not in the queue.");
            }
        }
        catch (Exception err)
        {
            SendMessage(err.Message);
        }

        return true;
    }

    public bool NextPlayer()
    {
        int num = GetNumArg();
        var queue = GetQueue();
        queue.RemoveRange(0, num);
        queue = FixQueue(queue);
        SaveQueue(queue);
        SendMessage(ListLive(queue));
        return true;
    }

    public bool RotatePlayer()
    {
        int num = GetNumArg();
        var queue = GetQueue();
        var players = queue.GetRange(0, num);
        queue.RemoveRange(0, num);
        queue.AddRange(players);
        queue = FixQueue(queue);
        SaveQueue(queue);
        SendMessage(ListLive(queue));
        return true;
    }

    public bool ShowQueue()
    {
        string limit_arg;
        int limit = (int)LimitType.All;
        if (!CPH.TryGetArg("input0", out limit_arg) || string.IsNullOrWhiteSpace(limit_arg))
        {
            limit = (int)LimitType.All;
        }
        else if (limit_arg == "live")
        {
            limit = (int)LimitType.Live;
        }
        else
        {
            try
            {
                limit = Int32.Parse(limit_arg);
            }
            catch
            {
                limit = (int)LimitType.All;
            }
        }

        var queue = GetQueue();
        string message = limit == (int)LimitType.Live ? ListLive(queue) : ListQueue(queue, limit);
        SendMessage(message);
        return true;
    }

    public bool SetLive()
    {
        int live = GetNumArg(-1);

        if (live < 0)
        {
            SendMessage($"Currently live players: {numLive}");
        } else
        {
            numLive = live;

            var queue = GetQueue();
            queue = FixQueue(queue);
            SaveQueue(queue);

            SendMessage($"Set live players to {numLive}");
        }

        return true;
    }

    // Set queue from JSON argument
    public bool SetQueue()
    {
        if (!CPH.TryGetArg("input0", out string queueJson) || string.IsNullOrWhiteSpace(queueJson))
        {
            return false;
        }

        var queue = JsonConvert.DeserializeObject<List<Player>>(queueJson);
        queue = FixQueue(queue);
        SaveQueue(queue);

        return true;
    }

    public bool OpenQueue()
    {
        isOpen = true;

        var queueMessage = this.queueMessage;
        if (string.IsNullOrWhiteSpace(queueMessage)) {
            SendMessage("Queue opened!");
        } else {
            SendMessage(queueMessage);
        }
        return true;
    }

    public bool CloseQueue()
    {
        isOpen = false;
        SendMessage("Queue closed!");
        return true;
    }

    public bool SetQueueMessage()
    {
        if (!CPH.TryGetArg("input0", out string queueMessage) || string.IsNullOrWhiteSpace(queueMessage))
        {
            return false;
        }

        this.queueMessage = queueMessage;
        return true;
    }

    // List queue up to limit (or all if limit <= 0)
    private string ListQueue(List<Player> queue, int limit)
    {
        if (queue.Count == 0)
        {
            return "The queue is empty.";
        }

        var sb = new StringBuilder();
        var max = limit <= 0 ? queue.Count : Math.Min(limit, queue.Count);
        for (int i = 0; i < max; i++)
        {
            var p = queue[i];
            sb.Append($" {i + 1}. @{p.name}");
            if (p.live)
            {
                sb.Append(" [LIVE]");
            }
        }

        return sb.ToString();
    }

    // List only live players (stops at first non-live)
    private string ListLive(List<Player> queue)
    {
        if (queue.Count == 0)
        {
            return "The queue is empty.";
        }

        var sb = new StringBuilder();
        for (int i = 0; i < queue.Count; i++)
        {
            var p = queue[i];
            if (!p.live)
            {
                break;
            }

            sb.Append($" {i + 1}. @{p.name} [LIVE]");
        }

        return sb.ToString();
    }

    private string GetTwitchUserName(string name)
    {
        name = name.TrimStart('@');
        var userInfo = CPH.TwitchGetUserInfoByLogin(name);

        return userInfo.UserName;
    }

    // Get viewer name from argument, throws if missing
    private string GetViewerName()
    {
        string viewerName;
        if (!CPH.TryGetArg("input0", out viewerName) || string.IsNullOrWhiteSpace(viewerName))
        {
            throw new Exception("You must select a user to add them to the queue!");
        }

        return GetTwitchUserName(viewerName);
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

    // Update live status based on numLive count
    private List<Player> FixQueue(List<Player> queue)
    {
        for (var i = 0; i < queue.Count; i++)
        {
            queue[i].live = i < numLive;
        }

        return queue;
    }

    // Get queue from global variable (returns empty list if null)
    private List<Player> GetQueue()
    {
        string queueJson = CPH.GetGlobalVar<string>(QUEUE_VAR_NAME, true);
        return JsonConvert.DeserializeObject<List<Player>>(queueJson)
               ?? new List<Player>();
    }

    // Save queue to global variable
    private void SaveQueue(List<Player> queue)
    {
        string queueJson = JsonConvert.SerializeObject(queue);
        CPH.SetGlobalVar(QUEUE_VAR_NAME, queueJson, true);
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

    public class Player
    {
        public string name { get; set; }
        public bool live { get; set; }
    }
}
