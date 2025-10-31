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
