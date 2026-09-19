# DZAIRLY MVP

MVP public de DZAIRLY — plateforme diaspora → événements en Algérie.

## Backend

Projet Supabase dédié : `DZAIRLY` (région Paris / eu-west-3).

Tables :
- `leads` : projets mariage / événements
- `vendor_applications` : candidatures prestataires
- `concierge_requests` : demandes de conciergerie
- `vendors` : profils publics publiés

La clé présente dans `config.js` est une **clé publishable Supabase**, prévue pour le navigateur. Aucune clé secrète/service-role n'est incluse dans ce projet.

## Sécurité

RLS activé sur toutes les tables.
- Public : INSERT uniquement sur les 3 formulaires.
- Public : aucune lecture des leads/candidatures/demandes de conciergerie.
- Public : SELECT uniquement des lignes `vendors` où `published = true`.

## Test local

```bash
python3 -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Déploiement

Le projet est statique et contient `vercel.json` avec des en-têtes de sécurité et une CSP autorisant uniquement la connexion au projet Supabase DZAIRLY.

## Lancement

Aucun paiement n'est activé dans ce MVP. Les profils de démonstration de l'annuaire sont explicitement étiquetés comme tels jusqu'à l'arrivée des premiers partenaires vérifiés.
