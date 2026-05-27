using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;

public class CPHInline
{
    public void Init()
    {
    }

    public bool AddPlayerToQueue()
    {
        try
        {
            var name = GetViewerName();
            var queue = GetQueue();
            var n_live = GetNumLive();
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
            SendMessage("Failed");
            SendMessage(err.Message);
        }

        return true;
    }

    public bool RemovePlayerFromQueue()
    {
        try
        {
            var name = GetViewerName();
            var queue = GetQueue();
            var n_live = GetNumLive();
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
        int limit = -1;
        if (!CPH.TryGetArg("input0", out limit_arg) || string.IsNullOrWhiteSpace(limit_arg))
        {
            limit = -1;
        }
        else if (limit_arg == "live")
        {
            limit = -2;
        }
        else
        {
            try
            {
                limit = Int32.Parse(limit_arg);
            }
            catch
            {
                limit = -1;
            }
        }

        var queue = GetQueue();
        string message = limit == -2 ? ListLive(queue) : ListQueue(queue, limit);
        SendMessage(message);
        return true;
    }

    private string ListQueue(List<Player> queue, int limit)
    {
        if (queue.Count == 0)
        {
            return "The queue is empty.";
        }

        var message = "";
        var max = limit <= 0 ? queue.Count : Math.Min(limit, queue.Count);
        for (int i = 0; i < max; i++)
        {
            var p = queue[i];
            message += $" {i + 1}. @{p.name}";
            if (p.live)
            {
                message += " [LIVE]";
            }
        }

        return message;
    }

    private string ListLive(List<Player> queue)
    {
        var message = "";
        for (int i = 0; i < queue.Count; i++)
        {
            var p = queue[i];
            if (!p.live)
            {
                break;
            }

            message += $" {i + 1}. @{p.name}";
            if (p.live)
            {
                message += " [LIVE]";
            }
        }

        return message;
    }

    private string GetViewerName()
    {
        string viewerName;
        if (!CPH.TryGetArg("input0", out viewerName) || string.IsNullOrWhiteSpace(viewerName))
        {
            throw new Exception("You must select a user to add them to the queue!");
        }

        return viewerName;
    }

    private int GetNumArg()
    {
        string num_arg;
        if (!CPH.TryGetArg("input0", out num_arg) || string.IsNullOrWhiteSpace(num_arg))
        {
            return 1;
        }
        else
        {
            try
            {
                return Int32.Parse(num_arg);
            }
            catch
            {
                return 1;
            }
        }
    }

    private List<Player> FixQueue(List<Player> queue)
    {
        var n_live = GetNumLive();
        for (var i = 0; i < queue.Count; i++)
        {
            queue[i].live = i < n_live;
        }

        return queue;
    }

    private List<Player> GetQueue()
    {
        string queueJson = CPH.GetGlobalVar<string>("viewerQueue", true);
        if (!string.IsNullOrEmpty(queueJson))
        {
            return JsonConvert.DeserializeObject<List<Player>>(queueJson);
        }
        else
        {
            return new List<Player>();
        }
    }

    private int GetNumLive()
    {
        return CPH.GetGlobalVar<int>("viewerLive", true);
    }

    private void SaveQueue(List<Player> queue)
    {
        string queueJson = JsonConvert.SerializeObject(queue);
        CPH.SetGlobalVar("viewerQueue", queueJson, true);
    }

    private void SendMessage(string msg)
    {
        CPH.SendMessage(msg, true, true);
    }

    public class Player
    {
        public string name { get; set; }
        public bool live { get; set; }
    }
}
