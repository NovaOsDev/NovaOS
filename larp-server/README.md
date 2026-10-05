# LARP Push Server

Backend für **LARP Demo**. Es speichert pro Gerät nur das Web-Push-Abo, einen zufälligen Gerätetoken und die geplanten Demo-Verkäufe.

## Ein-Klick-Deployment

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/NovaOsDev/NovaOS)

Cloudflare stellt die benötigte Durable-Object-Ressource automatisch bereit. Es sind **keine VAPID-Secrets** nötig: Jedes Gerät erhält beim ersten Verbinden ein eigenes VAPID-Schlüsselpaar, das ausschließlich im Durable Object gespeichert wird.

Nach dem Deployment:
1. Die Worker-URL kopieren, z. B. `https://larp-push-server.<dein-subdomain>.workers.dev`.
2. LARP öffnen → **Settings**.
3. Worker-URL bei **Push-Server** einfügen.
4. **Speichern & verbinden**.
5. iPhone-Mitteilungen erlauben.

Danach werden geplante Push-Mitteilungen serverseitig über Durable-Object-Alarms ausgelöst, auch wenn die LARP-Web-App geschlossen ist.

## Sicherheit

- Alle Mitteilungen heißen **LARP Demo** und enthalten **Simulation**.
- Fremde Shopify-/Bank-/Krypto-Marken werden nicht nachgeahmt.
- Planänderungen sind mit einem zufälligen Gerätetoken geschützt.
- Der Browser-Origin ist auf die NovaOS GitHub Pages App beschränkt.
- Maximal 250 Einträge pro Plan und maximal 7 Tage Vorausplanung.
