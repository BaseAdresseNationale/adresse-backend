const {WebClient} = require('@slack/web-api')

async function notifyPublication({commune, method}) {
  if (!process.env.SLACK_TOKEN || !process.env.SLACK_CHANNEL) {
    return
  }

  const web = new WebClient(process.env.SLACK_TOKEN)

  const text = `Publication ou mise à jour d’une Base Adresse Locale - **${commune.nom}** (${commune.code})
__Utilisation de ${method === 'franceconnect' ? 'FranceConnect :fr:' : 'l’authentification par email :email:'}__`

  return web.chat.postMessage({channel: process.env.SLACK_CHANNEL, text})
}

module.exports = {notifyPublication}
