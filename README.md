cat << 'EOF' > README.md
# Sbux Memory App

## Introduction

### For Baristas & Coffee Enthusiasts
**Sbux Memory App** is a digital training companion and flashcard deck built to help baristas quickly memorize coffee recipes, core drink builds, syrup pump counts, espresso shot specifications, and step-by-step beverage preparation procedures. Whether you are mastering the espresso bar, cold bar, or preparing for peak hours on the floor, this application provides an interactive, structured way to test and solidify your knowledge.

### Key Features
* **Drink Search & Filtering:** Instantly search through recipes by name or filter drinks by specific categories (e.g., *espresso bar, cold bar, core drinks, Frappuccinos, refreshers, iced teas, cold brew*) using advanced **Match All (AND)** or **Match Any (OR)** logic.
* **Drink Build Quiz (Advanced SRS):** Interactive flashcard system tracking mastery levels. Cards require multiple correct responses ("Know Well") to be marked as mastered, with persistent local storage tracking your progress.
* **Beginner Quiz:** Focused training on fundamental metrics such as syrup pumps and shot counts per cup size.
* **Recipe Modal Details:** Comprehensive breakdown of components (shots, pumps, scoops), hot vs. iced step-by-step instructions, and helpful floor tips.
* **Resources Library:** Quick access links to downloadable guides and reference materials like hot bar infographics and prep guides.

---

## Developer Documentation & Architecture

### Tech Stack
* **Framework:** React 18 with Vite
* **Routing:** `react-router-dom` using `createHashRouter` for static hosting compatibility (GitHub Pages)
* **Styling:** Modular CSS (`*.module.css`) with CSS custom properties supporting responsive layouts and dark/light mode variables
* **State Management:** React Hooks (`useState`, `useEffect`, `useMemo`, `useLocation`) alongside browser `localStorage` for Spaced Repetition System (SRS) persistence

### Project Directory Structure
```text
sbux-memory-app/
├── public/                 # Static assets & downloadable PDFs
├── src/
│   ├── assets/             # Images and visual assets
│   ├── components/         # Reusable UI components
│   │   ├── FilterControls/ # Tag filtering and logic toggles (AND/OR)
│   │   ├── Flashcard/      # Interactive 3D flip card component
│   │   ├── Footer/         # App footer and repository links
│   │   ├── Navbar/         # Responsive navigation bar with hamburger menu
│   │   ├── QuizChoiceMenu/ # Quiz selection navigation
│   │   ├── RecipeModal/    # Detailed modal view for recipes
│   │   └── SearchBar/      # Search input with live dropdown suggestions
│   ├── data/               # JSON datasets
│   │   ├── basics.json     # Fundamental size/shot/pump charts
│   │   └── recipes.json    # Complete drink recipes, components, and steps
│   ├── pages/              # Route views
│   │   ├── AdvancedQuiz.jsx# Drink build SRS quiz
│   │   ├── BeginnerQuiz.jsx# Fundamentals quiz
│   │   ├── Home.jsx        # Landing page with search & quick navigation
│   │   ├── Resources.jsx   # External reference links/PDFs
│   │   └── Search.jsx      # Recipe catalog, search, and filtering grid
│   ├── App.css             # Global CSS variables and layout resets
│   ├── App.jsx             # Root layout container (Navbar + Outlet + Footer)
│   └── main.jsx            # HashRouter configuration and React DOM root
├── eslint.config.js        # ESLint flat config
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite build configuration

My apologies for the rendering issue. To avoid markdown parser breaks entirely, you can create and populate both files directly in your terminal using the cat commands below.

Run these commands in your root directory (/Users/ejc/Developer/sbux-memory-app):

1. Create README.md
Bash
cat << 'EOF' > README.md
# Sbux Memory App

## Introduction

### For Baristas & Coffee Enthusiasts
**Sbux Memory App** is a digital training companion and flashcard deck built to help baristas quickly memorize coffee recipes, core drink builds, syrup pump counts, espresso shot specifications, and step-by-step beverage preparation procedures. Whether you are mastering the espresso bar, cold bar, or preparing for peak hours on the floor, this application provides an interactive, structured way to test and solidify your knowledge.

### Key Features
* **Drink Search & Filtering:** Instantly search through recipes by name or filter drinks by specific categories (e.g., *espresso bar, cold bar, core drinks, Frappuccinos, refreshers, iced teas, cold brew*) using advanced **Match All (AND)** or **Match Any (OR)** logic.
* **Drink Build Quiz (Advanced SRS):** Interactive flashcard system tracking mastery levels. Cards require multiple correct responses ("Know Well") to be marked as mastered, with persistent local storage tracking your progress.
* **Beginner Quiz:** Focused training on fundamental metrics such as syrup pumps and shot counts per cup size.
* **Recipe Modal Details:** Comprehensive breakdown of components (shots, pumps, scoops), hot vs. iced step-by-step instructions, and helpful floor tips.
* **Resources Library:** Quick access links to downloadable guides and reference materials like hot bar infographics and prep guides.

---

## Developer Documentation & Architecture

### Tech Stack
* **Framework:** React 18 with Vite
* **Routing:** `react-router-dom` using `createHashRouter` for static hosting compatibility (GitHub Pages)
* **Styling:** Modular CSS (`*.module.css`) with CSS custom properties supporting responsive layouts and dark/light mode variables
* **State Management:** React Hooks (`useState`, `useEffect`, `useMemo`, `useLocation`) alongside browser `localStorage` for Spaced Repetition System (SRS) persistence

### Project Directory Structure
```text
sbux-memory-app/
├── public/                 # Static assets & downloadable PDFs
├── src/
│   ├── assets/             # Images and visual assets
│   ├── components/         # Reusable UI components
│   │   ├── FilterControls/ # Tag filtering and logic toggles (AND/OR)
│   │   ├── Flashcard/      # Interactive 3D flip card component
│   │   ├── Footer/         # App footer and repository links
│   │   ├── Navbar/         # Responsive navigation bar with hamburger menu
│   │   ├── QuizChoiceMenu/ # Quiz selection navigation
│   │   ├── RecipeModal/    # Detailed modal view for recipes
│   │   └── SearchBar/      # Search input with live dropdown suggestions
│   ├── data/               # JSON datasets
│   │   ├── basics.json     # Fundamental size/shot/pump charts
│   │   └── recipes.json    # Complete drink recipes, components, and steps
│   ├── pages/              # Route views
│   │   ├── AdvancedQuiz.jsx# Drink build SRS quiz
│   │   ├── BeginnerQuiz.jsx# Fundamentals quiz
│   │   ├── Home.jsx        # Landing page with search & quick navigation
│   │   ├── Resources.jsx   # External reference links/PDFs
│   │   └── Search.jsx      # Recipe catalog, search, and filtering grid
│   ├── App.css             # Global CSS variables and layout resets
│   ├── App.jsx             # Root layout container (Navbar + Outlet + Footer)
│   └── main.jsx            # HashRouter configuration and React DOM root
├── eslint.config.js        # ESLint flat config
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite build configuration
Getting Started
1. Installation
Clone the repository and install dependencies using npm:

Bash
git clone [https://github.com/EjCabada/sbux-memory-app.git](https://github.com/EjCabada/sbux-memory-app.git)
cd sbux-memory-app
npm install
2. Running Locally
Start the development server via Vite:

Bash
npm run dev
Open http://localhost:5173 in your browser.

3. Building for Production
To generate a production-ready build in the dist/ directory:

Bash
npm run build
How to Add or Modify Drinks
Recipe and fundamental data are stored as JSON files inside src/data/.
Modifying Drink Recipes (src/data/recipes.json):
Each entry follows this structure:
JSON
{
  "name": "Caffè Latte",
  "tags": ["espresso bar", "core drinks"],
  "comments": "",
  "components": {
    "shots": [1, 2, 2, 3],
    "pumps": [2, 3, 4, 5]
  },
  "steps": {
    "hot": [
      "Queue Shots",
      "Aerate Milk to proper temperature (150-170°F)",
      "Pour shots into cup",
      "Free pour steamed milk",
      "Top with a dot of foam"
    ],
    "iced": [
      "Queue Shots into cup",
      "Add milk to the third line",
      "Add ice",
      "Pour shots on top"
    ]
  }
}
Note: Arrays under components and steps correspond sequentially to cup sizes (Short, Tall, Grande, Venti).
Modifying Basics (src/data/basics.json):
To update fundamental question/answer pairs for the beginner quiz, edit src/data/basics.json:
JSON
{
  "id": "b1",
  "question": "Shots and syrups in a Hot Caffè Latte",
  "answer": "Short: 1, Tall: 1, Grande: 2, Venti: 2"
}
EOF
