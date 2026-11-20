import React, { useState } from "react";
import MusorNezet from "./MusorNezet";
import UlesvalasztoNezet from "./UlesvalasztoNezet";

export default function App() {
  const [selectedScreening, setSelectedScreening] = useState(null);

  if (selectedScreening) {
    return (
      <UlesvalasztoNezet
        screeningProp={selectedScreening}
        onBack={() => setSelectedScreening(null)}
      />
    );
  }

  return <MusorNezet onSelectScreening={(screening) => setSelectedScreening(screening)} />;
}
