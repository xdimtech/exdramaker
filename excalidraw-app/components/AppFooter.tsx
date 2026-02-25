import React from "react";

import { Footer } from "@excalidraw/excalidraw/index";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { isExcalidrawPlusSignedUser } from "../app_constants";

import { EncryptedIcon } from "./EncryptedIcon";

export const AppFooter = React.memo(
  (_props: {
    onChange?: () => void;
    excalidrawAPI: ExcalidrawImperativeAPI | null;
  }) => {
    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {!isExcalidrawPlusSignedUser && <EncryptedIcon />}
        </div>
      </Footer>
    );
  },
);
