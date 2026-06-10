using System;
using System.Collections.Generic;
using System.Linq;


public class CPHInline
{
    private const string POINTS_VAR_NAME = "points";

    public void Init()
    {
    }

    public bool AddPoints()
    {
        try
        {
            var name = GetViewerName("input1");
            long amount = GetNumArg("input0");
            long res = AddUserPoints(name, amount);

            CPH.SetArgument("result", res);
            if (!isSilent())
            {
                SendMessage($"@{name} received {amount} points! They now have {res} points.");
            } 
        }
        catch (Exception err)
        {
            SendMessage($"Failed to add points: {err.Message}");
            return false;
        }

        return true;
    }

    public bool RemovePoints()
    {
        try
        {
            var name = GetViewerName("input1");
            long amount = GetNumArg("input0");
            long res = RemoveUserPoints(name, amount);

            CPH.SetArgument("result", res);
            if (!isSilent())
            {
                SendMessage($"@{name} lost {amount} points! They now have {res} points.");
            }
        }
        catch (Exception err)
        {
            SendMessage($"Failed to remove points: {err.Message}");
            return false;
        }

        return true;
    }

    public bool GivePoints()
    {
        try
        {
            var sourceName = GetViewerName("user");
            var destName = GetViewerName("input1");
            long amount = GetNumArg("input0");

            RemoveUserPoints(sourceName, amount);
            long res = AddUserPoints(destName, amount);

            CPH.SetArgument("result", res);
            if (!isSilent())
            {
                SendMessage($"@{sourceName} gave @{destName} {amount} of their points! @{destName} now has {res} points.");
            }
        }
        catch (Exception err)
        {
            SendMessage($"Failed to transfer points: {err.Message}");
            return false;
        }

        return true;
    }

    public bool SetPoints()
    {
        try
        {
            var name = GetViewerName("input1");
            long amount = GetNumArg("input0");
            SetUserPoints(name, amount);

            if (!isSilent())
            {
                SendMessage($"@{name} now has {amount} points.");
            }
        }
        catch (Exception err)
        {
            SendMessage($"Failed to set points: {err.Message}");
        }
        return true;
    }

    public bool GetPoints()
    {
        try
        {
            string name;
            try
            {
                name = GetViewerName();
            }
            catch
            {
                name = GetViewerName("user");
            }

            try
            {
                var leaderboardPos = GetLeaderboardPosition(name);

                CPH.SetArgument("result", leaderboardPos.points);
                if (!isSilent())
                {
                SendMessage($"@{name} has {leaderboardPos.points} points. They are rank {leaderboardPos.position} on the leaderboard.");
                }
            }
            catch
            {
                if (!isSilent())
                {
                SendMessage($"@{name} has 0 points.");
                }
            }

        }
        catch (Exception err)
        {
            SendMessage($"Failed to get points: {err.Message}");
        }
        return true;
    }

    public bool AddWatchPoints()
    {
        CPH.TryGetArg("users", out List<Dictionary<string,object>> users);
        CPH.TryGetArg("isLive", out bool live);

        if (live)
        {
            long points;
            string user;

            long pointsPerTick = GetPointsPerTick();

			for (int i = 0; i < users.Count; i++)
            {
                user = users[i]["userName"].ToString();

                points = GetUserPoints(user);
                points += pointsPerTick;
                SetUserPoints(user, points);
            }
        }

        return true;
    }

    private string GetArg(string arg)
    {
        if (!CPH.TryGetArg(arg, out string value) || string.IsNullOrWhiteSpace(value))
        {
            throw new Exception();
        }

        return value;
    }

    private string GetUserName(string name)
    {
        viewerName = viewerName.TrimStart('@');
        var userInfo = CPH.TwitchGetUserInfoByLogin(viewerName);

        return userInfo.UserName;
    }

    private string GetViewerName(string arg)
    {
        string viewerName;
        if (!CPH.TryGetArg(arg, out viewerName) || string.IsNullOrWhiteSpace(viewerName))
        {
            throw new Exception("You must select a user!");
        }

        return GetUserName(viewerName);
    }

    private string GetViewerName()
    {
        return GetViewerName("input0");
    }

    private int GetNumArg(string arg)
    {
        string num_arg;
        if (!CPH.TryGetArg(arg, out num_arg) || string.IsNullOrWhiteSpace(num_arg))
        {
            throw new Exception("You must provide a number!");
        }
        else
        {
            try
            {
                return Int32.Parse(num_arg);
            }
            catch
            {
                throw new Exception("You must provide a number!");
            }
        }
    }

    private int GetNumArg()
    {
        return GetNumArg("input0");
    }

    private void SetUserPoints(string user, long points)
    {
        CPH.SetTwitchUserVar(user, POINTS_VAR_NAME, points, true);
    }

    private long GetUserPoints(string user)
    {
        return CPH.GetTwitchUserVar<long?>(user, POINTS_VAR_NAME, true) ?? 0;
    }

    private long AddUserPoints(string user, long amount)
    {
        long current = GetUserPoints(user);
        long res = current + amount;
        SetUserPoints(user, res);

        return res;
    }

    private long RemoveUserPoints(string user, long amount)
    {
        long current = GetUserPoints(user);
        if (current < amount)
        {
            throw new Exception($"Not enough points! @{user} has {current} points and needs {amount}.");
        }

        long res = current - amount;
        SetUserPoints(user, res);

        return res;
    }

    private List<UserPoints> GetLeaderboard()
    {
        List<UserVariableValue<long>> userPointList = CPH.GetTwitchUsersVar<long>(POINTS_VAR_NAME, true);
        List<UserPoints> leaderboard = userPointList.Select(el => new UserPoints() { name = el.UserName, points = el.Value }).ToList();
        leaderboard.Sort((x, y) => y.points.CompareTo(x.points));

        return leaderboard;
    }


    private LeaderboardPos GetLeaderboardPosition(string user)
    {
        var leaderboard = GetLeaderboard();
        var idx = leaderboard.FindIndex(el => el.name == user);

        return new LeaderboardPos { position = idx + 1, points = leaderboard[idx].points };
    }

    private long GetPointsPerTick()
    {
        return CPH.GetGlobalVar<long?>("pointsPerTick", true) ?? 50;
    }

    private void SendMessage(string msg)
    {
        CPH.SendMessage(msg, true, true);
    }

    private bool isSilent()
    {
        if (!CPH.TryGetArg<bool>("silent", out bool silent)) {
            return false;
        }

        return silent;
    }

    public class LeaderboardPos
    {
        public long position { get; set; }
        public long points { get; set; }
    }

    public class UserPoints
    {
        public string name { get; set; }
        public long points { get; set; }
    }
}

