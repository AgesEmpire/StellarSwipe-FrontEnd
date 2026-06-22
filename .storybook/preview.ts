import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color|backgroundColor)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
