# api-bal

## /datasets
> Liste des jeux de données BAL répertoriés sur data.gouv.fr grâce au tag `base-adresse-locale` possédant une ressource au format `csv`

- `id`: Identifiant du jeu de données *[string]*
- `title`: Titre du fichier *[string]*
- `license`: License du jeu de données *[string]*
- `licenseLabel`: Libellé de la license en français *[string]*
- `organization`: Informations du producteur de la donnée (nom, logo, lien vers page data.gouv.fr) *[array]*
- `page`: Lien vers la page du jeu de données sur data.gouv.fr *[string]*
- `url`: Lien de téléchargement de la donnée *[string]*
- `valid`: Vérification de la conformité du fichier bal *[bool]*
- `status`: Status de l’analyse du fichier  *[string]*
- `error`: Erreur rencontrer durant l’analyse du fichier *[string]*

## /datasets/:id
> Rapport complet de l’analyse de conformité du jeu de données demandé

- `id`: Identifiant du jeu de données *[string]*
- `title`: Titre du fichier *[string]*
- `report`: Rapport complet de l’analyse de conformité du jeu de données *[object]*
- `license`: License du jeu de données *[string]*
- `licenseLabel`: Libellé de la license en français *[string]*
- `organization`: Informations du producteur de la donnée (nom, logo, lien vers page data.gouv.fr) *[array]*
- `page`: Lien vers la page du jeu de données sur data.gouv.fr *[string]*
- `url`: Lien de téléchargement de la donnée *[string]*
- `valid`: Vérification de la conformité du fichier bal *[bool]*
- `status`: Status de l’analyse du fichier  *[string]*
- `error`: Erreur rencontrer durant l’analyse du fichier *[string]*