# 💸 Expense Tracker

A simple, no-build personal finance tracker (plain HTML/CSS/JS, USD).

## Tracks
- **Weekly earnings** – grouped Mon–Sun, 8-week bar chart
- **Monthly payments** – recurring bills that repeat every month until deleted
- **Savings** – with an optional monthly goal and progress bar
- **Daily payments** – everyday spending, plus today's total
- **Unexpected charges** – one-off surprises

Balance = earnings − (monthly + daily + unexpected) − savings.

## Features
Month navigation, spending breakdown donut, filters, CSV export, JSON backup/restore, light/dark theme, mobile friendly. Data stays in your browser's `localStorage`.

## Run
Open `index.html`, or serve the folder: `python3 -m http.server`.
