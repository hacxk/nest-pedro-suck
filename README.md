<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

**Instant Messaging API**

This API enables real-time communication through WhatsApp, leveraging the Baileys library for seamless integration. Authentication is handled using JWT tokens, ensuring secure access to user-specific instances and actions.

**Table of Contents**

-   [Authentication](#authentication)
    -   [/auth/signup](#authsignup)
    -   [/auth/login](#authlogin)
-   [WhatsApp Instance Management](#whatsapp-instance-management)
    -   [/whatsapp/auth](#whatsappauth)
    -   [/whatsapp/auth/status/:email](#whatsappauthstatusemail)
    -   [/whatsapp/instance-close](#whatsappinstance-close)
-   [Messaging](#messaging)
    -   [/instant-messaging/:token](#instant-messagingtoken)

**Authentication**

*   **`/auth/signup`** (POST)
    *   **Purpose:** Create a new user account.
    *   **Request Body:** `CreateUserDto` (email, password)
    *   **Success Response:** HTTP 201 (Created)

*   **`/auth/login`** (POST)
    *   **Purpose:** Authenticate and obtain a JWT token.
    *   **Request Body:** `LoginUserDto` (email, password)
    *   **Success Response:** HTTP 200 (OK), JWT token in the body

**WhatsApp Instance Management**

*   **`/whatsapp/auth`** (POST)
    *   **Purpose:** Authenticate a user and initiate a WhatsApp connection. This generates a QR code if needed for initial device linking.
    *   **Request Body:** `instanceDto` (token)
    *   **Success Response:** HTTP 200 (OK), QR code data URL or success message

*   **`/whatsapp/auth/status/:email`** (GET)
    *   **Purpose:** Check the connection status of a WhatsApp instance associated with a user's email.
    *   **Path Parameter:** `email` (user's email address)
    *   **Success Response:** HTTP 200 (OK), status object (e.g., { status: "connected" })

*   **`/whatsapp/instance-close`** (POST)
    *   **Purpose:** Close the WhatsApp socket connection associated with the authenticated user.
    *   **Request Body:** `{ email, token }` (user's email and JWT token)
    *   **Success Response:** HTTP 200 (OK)

**Messaging**

*   **`/instant-messaging/:token`** (POST)
    *   **Purpose:** Send a message to a WhatsApp contact.
    *   **Path Parameter:** `token` (JWT token)
    *   **Request Body:** `SendMessageDto` (jid, message)
        *   `jid`: WhatsApp ID of the recipient
        *   `message`: Message content (text message currently supported)
    *   **Success Response:** HTTP 200 (OK), object indicating success or Baileys response object

**Example Usage (Sending a Message)**

```bash
POST /instant-messaging/YOUR_JWT_TOKEN
Content-Type: application/json

{
    "jid": "RECIPIENT_PHONE_NUMBER@s.whatsapp.net",
    "message": { "text": "Hello from the API!" }
}
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
