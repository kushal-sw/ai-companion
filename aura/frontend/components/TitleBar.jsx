// macOS native title bar
// → WebkitAppRegion: drag
// → Shows Aura name + online status

import React from 'react';

export default function TitleBar() {
  return (
    <div className="title-bar">
      <span className="title-bar__name">Aura</span>
      <div className="title-bar__status">
        <span className="title-bar__dot" />
        <span>Online</span>
      </div>
    </div>
  );
}
