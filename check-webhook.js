const token = process.env.TELEGRAM_BOT_TOKEN || '8701971011:AAFJKXyGIqeEBxU8nYMS7eH1I_oWyvsli4A';
const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;

fetch(url)
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
