# Privacy Policy for "LiveSticky" Reddit Bot

**Effective Date:** May 17, 2026

This Privacy Policy explains how the "LiveSticky" Reddit Bot (referred to as "the App" or "the Bot") handles information. The App is built on Reddit's Developer Platform (Devvit) and is designed to automatically monitor a designated Twitch channel and create/pin posts on a specified subreddit when the stream goes live, and unpin/remove the post when the stream goes offline.

We are committed to protecting user privacy and ensuring transparency in all our data practices.

---

## 1. Information We Collect

### A. Personal Information

The App **does not collect, store, or process any Personally Identifiable Information (PII)** or personal data belonging to Reddit users who interact with the subreddits where the App is installed.

### B. Public and Operational Data

To perform its core functions, the App accesses and processes only the following non-sensitive operational data:

* **Twitch Channel Name:** The public username of the Twitch stream being monitored, as configured by the subreddit moderators.
* **Stream Metadata:** Publicly available stream information retrieved from the Twitch Helix API, including the stream status (live/offline) and the current stream title.
* **Reddit Post ID:** The identifier of the Reddit post created by the Bot when the stream goes live, which is used solely to locate and unpin/remove the post when the stream goes offline.

---

## 2. How We Access and Use Your Data

The App uses the standard, secure Reddit Devvit environment to perform its functions:

* **Scheduled Polling:** Every 2 minutes, a server-side scheduler runs a query to check if the designated Twitch channel is currently streaming.
* **Twitch API Fetch:** The Bot makes secure, outgoing server-side HTTP `fetch` requests to the official, public Twitch APIs:
  * `id.twitch.tv` (to exchange Client Credentials for a temporary Twitch API access token)
  * `api.twitch.tv` (to fetch the live/offline status of the configured channel)
* **Subreddit Posting:** If the stream is live, the Bot submits a post to the subreddit using Reddit's native API, stickies it to the top of the feed, and saves the post's unique ID to manage it later.

---

## 3. Data Storage and Retention

The App does not use any external databases or personal servers.

* **Reddit Redis Store:** The Bot stores operational state variables (such as `is_live_pinned` and `live_post_id`) entirely within Reddit’s secure, internal Key-Value (Redis) store provided by the Devvit platform.
* **Retention:** State data in the Redis store is persistent only as long as required to manage the active post. Once a stream ends and the corresponding post is unpinned, all associated operational state data is deleted from the Redis store.

---

## 4. Sharing of Information

* **No Third-Party Sharing:** The App **does not share, sell, or transmit any Reddit user data** to Twitch or any other third-party service.
* **Twitch API Interaction:** Outgoing requests to Twitch's API only request public stream status and do not contain any information about Reddit users, moderators, or subreddits.
* **Reddit Platform Compliance:** All activities are processed within Reddit’s infrastructure and adhere strictly to Reddit’s Developer Terms and Privacy Policy.

---

## 5. Security

The App is hosted entirely on Reddit's secure Developer Platform (Devvit) infrastructure. It inherits all of Reddit's enterprise-grade security protocols, access controls, and data protection mechanisms. No direct external access to the Bot’s internal state or configuration is possible.

---

## 6. Your Rights and Choices

* **Moderators:** Subreddit moderators have complete control over the Bot. You can change the monitored channel or completely disable/uninstall the Bot at any time through the subreddit's App Settings.
* **Users:** Because the Bot does not collect or store personal data, there is no personal profile or tracking data to access, correct, or delete.

---

## 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in our practices or for operational, legal, or regulatory reasons. The "Effective Date" at the top of this document will be updated accordingly.

---

## 8. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy or the "LiveSticky" Reddit Bot, please contact the developer:

* **Legal & privacy:** [legal@livesticky.com](mailto:legal@livesticky.com)
* **Support:** [support@livesticky.com](mailto:support@livesticky.com)
* **Website:** [livesticky.com](https://livesticky.com)
* **Reddit:** [u/iammesutkaya](https://www.reddit.com/user/iammesutkaya)
