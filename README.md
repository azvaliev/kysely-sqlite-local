# kysely-sqlite

An opinionated pattern for setting up a local kysely + SQLite

The opionated stuff it does
- Auto run the migrations when the DB is opened
- Include camel case plugin
- Saves your DB in an application data folder using [env-paths](https://www.npmjs.com/package/env-paths#usage)
- Written in pure JS so you can easily go to defintion and understand how the library works, tweak it, fork it, etc without dealing with JS build tooling
