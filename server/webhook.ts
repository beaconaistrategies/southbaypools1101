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
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      console.error(`Webhook notification failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to send webhook notification:", error);
  }
}
