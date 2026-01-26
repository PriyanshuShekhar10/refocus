// import React from "react";

import Calendar from "./Calendar";
import DesktopOnlyWrapper from "./DesktopOnlyWrapper";
// import CalendarBooking from "./CalendarBooking";

export default function Dashboard() {
  return (
    <DesktopOnlyWrapper minWidth={1024}>
      <div>
        {/* <CalendarBooking /> */}
        <Calendar />
        {/* Dashboard Content */}
      </div>
    </DesktopOnlyWrapper>
  );
}