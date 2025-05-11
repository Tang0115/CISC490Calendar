# calendar-app

Version: 0.1.0

A simple calendar application built with React. It allows users to view a calendar, see details for a specific day, manage events (including recurring events), and switch between light and dark themes. Events are stored in the browser's local storage.

## Features

*   **Calendar View:** Displays a full calendar.
*   **Day View:** Shows detailed information for a selected day.
*   **Event Management:** Create, view, and manage events.
*   **Recurring Events:** Option to set up recurring events.
*   **Theme Toggle:** Switch between light and dark user interface themes.
*   **Local Storage:** Events are saved locally in the browser.
*   **Real-time Clock:** Displays the current time.

## Tech Stack

*   **Frontend:**
    *   React
    *   React Router
    *   FullCalendar (@fullcalendar/react, @fullcalendar/daygrid, @fullcalendar/timegrid, @fullcalendar/interaction)
    *   date-fns
    *   GSAP (for animations, though usage isn't explicitly detailed in App.js)
    *   Axios (for HTTP requests, though usage isn't explicitly detailed in App.js)
*   **Styling:**
    *   CSS
*   **Development:**
    *   React Scripts
    *   ESLint
*   **Potential Backend/Cloud Integration:**
    *   AWS SDK (suggests potential integration with AWS services, though usage isn't explicitly detailed in App.js)

## Getting Started

### Prerequisites

*   Node.js and npm (or yarn) installed on your system.

### Installation

1.  Clone the repository (if applicable).
2.  Navigate to the project directory:
    ```bash
    cd calendar-app
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```
    Or, if you prefer yarn:
    ```bash
    yarn install
    ```

## Available Scripts

In the project directory, you can run the following commands:

### `npm start` or `yarn start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test` or `yarn test`

Launches the test runner in interactive watch mode.

### `npm run build` or `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `npm run eject` or `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc.) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point, you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However, we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

### `npm run lint` or `yarn lint`

Runs ESLint to check for linting errors in `src/**/*.{js,jsx}` files and attempts to fix them.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

This project is currently private (as per `package.json`). If you intend to distribute it, please add a license file.
