const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not defined in process.env");
  process.exit(1);
}
const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;

fetch(url)
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
