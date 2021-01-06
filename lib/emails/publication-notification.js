const {template} = require('lodash')
const {getApiUrl} = require('./util')

const bodyTemplate = template(`
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Création d’une nouvelle Base Adresse Locale</title>
  <style>
    body {
      background-color: #F5F6F7;
      color: #234361;
      font-family: "SF UI Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      margin: auto;
      padding: 25px;
    }

    a {
      text-decoration: none;
    }

    p {
      max-width: 800px;
    }

    button {
      background-color: #003b80;
      border: none;
      border-radius: 3px;
      padding: 10px;
    }

    img {
      max-height: 45px;
      background-color: #F5F6F7;
    }

    .bal {
      font-size: 25px;
      font-weight: bold;
    }

    .container {
      background-color: #ebeff3;
      padding: 25px;
    }

    .forceWhiteLink button a {
      color:#FFF!important;
    }

    .infos {
      margin-top: 35px;
    }

    .title {
      align-items: center;
      border-bottom: 1px solid #E4E7EB;
      justify-content: center;
      margin-top: 35px;
      min-height: 10em;
      padding: 10px;
      text-align: center;
    }

    .footer {
      margin-top: 50px;
    }
  </style>
</head>

<body>
  <div>
    <img src="<%= apiUrl %>/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h2 style="margin:0; mso-line-height-rule:exactly;">Félicitations !</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Votre Base Adresse Locale est désormais publiée !</h3>
  </div>

  <div class="container">
    <p>Les adresses de votre commune sont maintenant à jour et viennent alimenter les référentiels nationaux.</p>
    <p>Il est désormais plus simple pour vos administrés d'être&nbsp;:</p>
    <ul>
      <li>déclarés auprès des fournisseurs d'eau et d'énergies</li>
      <li>éligibles à la fibre</li>
      <li>livrés</li>
      <li>ou même secourus</li>
    </ul>

    <p>Vous pouvez consulter vos adresses dans la <b><i>Base Adresse Nationale</i></b> ici&nbsp;: </p>
    <span class="forceWhiteLink"><button><a href="https://adresse.data.gouv.fr/base-adresse-nationale/<%= commune.code %>" target="blank">Consulter</a></button></span>

    <p><i>Si vous souhaitez mettre à jour vos adresses, il vous suffit de les éditer directement depuis votre Base Adresse Locale et les changements seront appliqués automatiquement d‘ici quelques jours.</i></p>
     <span class="forceWhiteLink"><button><a
          href="https://mes-adresses.data.gouv.fr"
          target="blank">Gerere mes adresses</a></button></span>

    <div class="footer">
      <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>
      <span><i>L’équipe adresse.data.gouv.fr</i></span>
    </div>
  </div>
</body>

</html>
`)

function formatEmail(data) {
  const {commune} = data
  const apiUrl = getApiUrl()

  return {
    subject: 'Création d’une nouvelle Base Adresse Locale',
    html: bodyTemplate({commune, apiUrl})
  }
}

module.exports = formatEmail
