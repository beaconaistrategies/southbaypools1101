// Google Sheets sync — fires after any successful signup or square claim
export async function pushSignupToSheet(data: {
  name: string;
  email: string;
  poolName: string;
  entryName?: string;
  squareNumber?: number | null;
  entryFee?: number | null;
}): Promise<void> {
  const url = process.env.SHEET_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: "SBP_1101",
        name: data.name,
        email: data.email,
        poolName: data.poolName,
        entryName: data.entryName || data.name,
        entryFee: data.entryFee ?? "",
        date: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Sheet webhook failed:", err);
  }
}

export async function pushPaymentToSheet(data: {
  name: string;
  email: string;
  poolName: string;
  entryName?: string;
  squareNumber?: number | null;
  amount?: string | null;
  method?: string;
}): Promise<void> {
  const WEB_APP_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!WEB_APP_URL) {
    console.log("⚠️  GOOGLE_SHEET_WEBHOOK_URL not set, skipping sheet sync");
    return;
  }

  const payload = {
    secret: "SBP_1101",
    name: data.name,
    email: data.email,
    amount: data.amount ?? "",
    note: data.poolName,
    method: data.method || "WEB",
    date: new Date().toISOString(),
    ...(data.entryName != null && { entryName: data.entryName }),
    ...(data.squareNumber != null && { squareNumber: data.squareNumber }),
  };

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => res.text());
    console.log("✅ Sheet sync:", result);
  } catch (err) {
    console.error("❌ Sheet sync failed:", err);
  }
}

// Golf pick notification webhook
export async function sendGolfPickWebhookNotification(
  webhookUrl: string,
  data: {
    poolName: string;
    poolId: string;
    entryName: string;
    recipientEmail: string;
    recipientName: string;
    golferName: string;
    tournamentName: string;
    weekNumber: number;
  }
): Promise<void> {
  if (!webhookUrl) {
    console.log("⚠️  Golf webhook URL not configured, skipping notification");
    return;
  }

  console.log(`🏌️ Sending golf pick notification for ${data.golferName} to ${webhookUrl}`);

  try {
    const payload = {
      event: "golf_pick_submitted",
      timestamp: new Date().toISOString(),
      data,
      // Flattened fields for n8n compatibility
      to: data.recipientEmail,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: `Golf Pick Confirmed - Week ${data.weekNumber}: ${data.golferName}`,
      poolName: data.poolName,
      poolId: data.poolId,
      entryName: data.entryName,
      golferName: data.golferName,
      tournamentName: data.tournamentName,
      weekNumber: data.weekNumber,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`❌ Golf webhook notification failed: ${response.status} ${response.statusText}`);
      console.error(`   Response body: ${errorText}`);
    } else {
      console.log(`✅ Golf pick notification sent successfully for ${data.golferName}`);
    }
  } catch (error) {
    console.error("❌ Failed to send golf webhook notification:", error);
    console.error(`   Webhook URL: ${webhookUrl}`);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
  }
}

// Golf pool signup notification webhook
export async function sendGolfSignupWebhookNotification(
  webhookUrl: string,
  data: {
    poolName: string;
    poolId: string;
    recipientEmail: string;
    recipientName: string;
  }
): Promise<void> {
  if (!webhookUrl) {
    console.log("⚠️  Golf webhook URL not configured, skipping signup notification");
    return;
  }

  console.log(`🏌️ Sending golf signup notification for ${data.recipientName} to ${webhookUrl}`);

  try {
    const payload = {
      event: "golf_user_signup",
      timestamp: new Date().toISOString(),
      data,
      to: data.recipientEmail,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: `Welcome to ${data.poolName}!`,
      poolName: data.poolName,
      poolId: data.poolId,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`❌ Golf signup webhook failed: ${response.status} ${response.statusText}`);
      console.error(`   Response body: ${errorText}`);
    } else {
      console.log(`✅ Golf signup notification sent successfully for ${data.recipientName}`);
    }
  } catch (error) {
    console.error("❌ Failed to send golf signup webhook notification:", error);
    console.error(`   Webhook URL: ${webhookUrl}`);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
  }
}

// Golf entry creation notification webhook
export async function sendGolfEntryWebhookNotification(
  webhookUrl: string,
  data: {
    poolName: string;
    poolId: string;
    entryName: string;
    entryNumber: number;
    recipientEmail: string;
    recipientName: string;
  }
): Promise<void> {
  if (!webhookUrl) {
    console.log("⚠️  Golf webhook URL not configured, skipping entry notification");
    return;
  }

  console.log(`🏌️ Sending golf entry notification for ${data.entryName} to ${webhookUrl}`);

  try {
    const payload = {
      event: "golf_entry_created",
      timestamp: new Date().toISOString(),
      data,
      to: data.recipientEmail,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: `Entry Created - ${data.entryName} in ${data.poolName}`,
      poolName: data.poolName,
      poolId: data.poolId,
      entryName: data.entryName,
      entryNumber: data.entryNumber,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`❌ Golf entry webhook failed: ${response.status} ${response.statusText}`);
      console.error(`   Response body: ${errorText}`);
    } else {
      console.log(`✅ Golf entry notification sent successfully for ${data.entryName}`);
    }
  } catch (error) {
    console.error("❌ Failed to send golf entry webhook notification:", error);
    console.error(`   Webhook URL: ${webhookUrl}`);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
  }
}

// Football squares notification webhook
export async function sendWebhookNotification(
  webhookUrl: string,
  data: {
    contestName: string;
    contestId: string;
    entryName: string;
    holderEmail: string;
    holderName: string;
    squareNumber: number;
    topTeam: string;
    leftTeam: string;
    eventDate: string;
  }
): Promise<void> {
  if (!webhookUrl) {
    console.log("⚠️  Webhook URL not configured, skipping notification");
    return;
  }

  console.log(`📧 Sending webhook notification for square #${data.squareNumber} to ${webhookUrl}`);

  try {
    const payload = {
      event: "square_claimed",
      timestamp: new Date().toISOString(),
      // Include both nested data and flattened fields for n8n compatibility
      data,
      // Gmail-friendly fields at root level
      to: data.holderEmail,
      recipientEmail: data.holderEmail,
      recipientName: data.holderName,
      subject: `Square #${data.squareNumber} Claimed - ${data.contestName}`,
      contestName: data.contestName,
      contestId: data.contestId,
      entryName: data.entryName,
      squareNumber: data.squareNumber,
      topTeam: data.topTeam,
      leftTeam: data.leftTeam,
      eventDate: data.eventDate,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`❌ Webhook notification failed: ${response.status} ${response.statusText}`);
      console.error(`   Response body: ${errorText}`);
    } else {
      console.log(`✅ Webhook notification sent successfully for square #${data.squareNumber}`);
    }
  } catch (error) {
    console.error("❌ Failed to send webhook notification:", error);
    console.error(`   Webhook URL: ${webhookUrl}`);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
  }
}
