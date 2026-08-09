import React from "react";

import SvgIcon, {SvgIconProps} from "@mui/material/SvgIcon";

/** The reverse of OpenInNew: an arrow arriving in a square rather than leaving one. */
function DockIcon(props: SvgIconProps) {
  return (
    <SvgIcon data-testid="DockIcon" {...props}>
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
      <path d="M13 17v-2h-2.59l6.83-6.83-1.41-1.41L9 13.59V11H7v6h6z"/>
    </SvgIcon>
  );
}

export {DockIcon};
