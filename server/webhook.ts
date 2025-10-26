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
        data,
      }),
    });

    if (!response.ok) {
      console.error(`Webhook notification failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to send webhook notification:", error);
  }
}
