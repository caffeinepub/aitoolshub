import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type OldUserProfile = { username : Text; email : Text };
  type OldUsageEntry = {
    usageId : Nat;
    user    : Principal;
    toolName : Text;
    timestamp : Time.Time;
    creditsSpent : Nat;
  };
  type OldUserRecord = {
    username     : Text;
    email        : Text;
    passwordHash : Text;
    credits      : Nat;
  };

  let userProfiles      = Map.empty<Principal, OldUserProfile>();
  let userCredits       = Map.empty<Principal, Nat>();
  let userPasswords     = Map.empty<Principal, Text>();
  let emailToPrincipal  = Map.empty<Text, Principal>();
  let users             = Map.empty<Text, OldUserRecord>();
  let usageEntries      = Map.empty<Nat, OldUsageEntry>();

  type LegacyNewUsageEntry = {
    usageId      : Nat;
    email        : Text;
    toolName     : Text;
    timestamp    : Time.Time;
    creditsSpent : Nat;
  };
  let newUsageEntries = Map.empty<Nat, LegacyNewUsageEntry>();

  public type Tool = { name : Text; price : Nat };
  let tools = Map.fromIter<Text, Tool>([
    ("background-remover", { name = "background-remover"; price = 1 }),
    ("watermark-remover",  { name = "watermark-remover";  price = 1 }),
    ("audio-editor",       { name = "audio-editor";       price = 1 }),
    ("background-changer", { name = "background-changer"; price = 1 }),
    ("text-to-speech",     { name = "text-to-speech";     price = 1 })
  ].values());

  public type UserProfile = { username : Text; email : Text };

  public type UsageEntry = {
    usageId      : Nat;
    email        : Text;
    toolName     : Text;
    timestamp    : Time.Time;
    creditsSpent : Nat;
  };

  public type FeedbackEntry = {
    feedbackId : Nat;
    email      : Text;
    rating     : Nat;
    message    : Text;
    timestamp  : Time.Time;
  };

  stable var usersEntries  : [(Text, OldUserRecord)] = [];
  stable var usageArr      : [(Nat, LegacyNewUsageEntry)] = [];
  stable var nextUsageId   : Nat = 0;
  stable var feedbackArr   : [(Nat, FeedbackEntry)] = [];
  stable var nextFeedbackId : Nat = 0;

  // -1 means not initialized yet; set to now on first heartbeat so the
  // 24-hour clock starts from today's deployment (no immediate grant).
  stable var lastDailyCreditTime : Time.Time = -1;

  let ONE_DAY_NS : Time.Time = 24 * 60 * 60 * 1_000_000_000;
  let DAILY_CREDIT_AMOUNT : Nat = 5;

  let emailUsers = Map.fromIter<Text, OldUserRecord>(usersEntries.values());
  let emailUsage = Map.fromIter<Nat, LegacyNewUsageEntry>(usageArr.values());
  let feedbacks  = Map.fromIter<Nat, FeedbackEntry>(feedbackArr.values());

  system func preupgrade() {
    usersEntries := emailUsers.entries().toArray();
    usageArr     := emailUsage.entries().toArray();
    feedbackArr  := feedbacks.entries().toArray();
  };

  system func postupgrade() {
    usersEntries := [];
    usageArr     := [];
    feedbackArr  := [];
  };

  system func heartbeat() : async () {
    let now = Time.now();
    if (lastDailyCreditTime == -1) {
      lastDailyCreditTime := now;
    } else if (now - lastDailyCreditTime >= ONE_DAY_NS) {
      lastDailyCreditTime := now;
      for ((email, record) in emailUsers.entries()) {
        emailUsers.add(email, {
          username     = record.username;
          email        = record.email;
          passwordHash = record.passwordHash;
          credits      = record.credits + DAILY_CREDIT_AMOUNT;
        });
      };
    };
  };

  func authenticate(email : Text, passwordHash : Text) : OldUserRecord {
    switch (emailUsers.get(email)) {
      case (null)    { Runtime.trap("User not found") };
      case (?record) {
        if (record.passwordHash != passwordHash) Runtime.trap("Invalid password");
        record;
      };
    };
  };

  public func register(username : Text, email : Text, passwordHash : Text) : async () {
    switch (emailUsers.get(email)) {
      case (?_) { Runtime.trap("Email already registered") };
      case (null) {};
    };
    let initialCredits : Nat = if (email == "ashmitrastogi105@email.com") 100 else 5;
    emailUsers.add(email, { username; email; passwordHash; credits = initialCredits });
  };

  public func login(email : Text, passwordHash : Text) : async UserProfile {
    let record = authenticate(email, passwordHash);
    { username = record.username; email = record.email };
  };

  public func getCredits(email : Text, passwordHash : Text) : async Nat {
    authenticate(email, passwordHash).credits;
  };

  public func adminSetCredits(email : Text, amount : Nat) : async () {
    switch (emailUsers.get(email)) {
      case (null) { Runtime.trap("User not found") };
      case (?record) {
        emailUsers.add(email, {
          username     = record.username;
          email        = record.email;
          passwordHash = record.passwordHash;
          credits      = amount;
        });
      };
    };
  };

  public func adminAddCredits(email : Text, amount : Nat) : async () {
    switch (emailUsers.get(email)) {
      case (null) { Runtime.trap("User not found") };
      case (?record) {
        emailUsers.add(email, {
          username     = record.username;
          email        = record.email;
          passwordHash = record.passwordHash;
          credits      = record.credits + amount;
        });
      };
    };
  };

  public func useTool(toolName : Text, email : Text, passwordHash : Text) : async () {
    let record = authenticate(email, passwordHash);
    let tool = switch (tools.get(toolName)) {
      case (?t)   { t };
      case (null) { Runtime.trap("Tool does not exist") };
    };
    if (tool.price > record.credits) Runtime.trap("Insufficient credits");
    emailUsers.add(email, {
      username     = record.username;
      email        = record.email;
      passwordHash = record.passwordHash;
      credits      = record.credits - tool.price;
    });
    let id = nextUsageId;
    nextUsageId += 1;
    emailUsage.add(id, {
      usageId = id; email; toolName;
      timestamp = Time.now(); creditsSpent = tool.price;
    });
  };

  public func getToolUsageHistory(email : Text, passwordHash : Text) : async [UsageEntry] {
    ignore authenticate(email, passwordHash);
    emailUsage.values().toArray()
      .filter(func(e : LegacyNewUsageEntry) : Bool { e.email == email })
      .map(func(e : LegacyNewUsageEntry) : UsageEntry {{
        usageId = e.usageId;
        email = e.email;
        toolName = e.toolName;
        timestamp = e.timestamp;
        creditsSpent = e.creditsSpent;
      }});
  };

  public func submitFeedback(email : Text, passwordHash : Text, rating : Nat, message : Text) : async () {
    ignore authenticate(email, passwordHash);
    let id = nextFeedbackId;
    nextFeedbackId += 1;
    feedbacks.add(id, {
      feedbackId = id;
      email;
      rating;
      message;
      timestamp = Time.now();
    });
  };

  public func getFeedbacks(email : Text, passwordHash : Text) : async [FeedbackEntry] {
    ignore authenticate(email, passwordHash);
    if (email != "ashmitrastogi105@email.com") {
      return [];
    };
    feedbacks.values().toArray();
  };

  public query func getLastDailyCreditTime() : async Time.Time {
    lastDailyCreditTime;
  };

  public query func getAvailableTools() : async [Tool] {
    tools.values().toArray();
  };
};
