import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./CalendarBooking.module.css"; // Using CSS Modules

// --- Helper Functions (can be moved to a utils.js file) ---

function minutesToTimeString(totalMinutes) {
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  const ampm = hh >= 12 ? "PM" : "AM";
  const displayHH = hh % 12 === 0 ? 12 : hh % 12;
  return `${displayHH}:${String(mm).padStart(2, "0")} ${ampm}`;
}

// --- Child Components ---

const TimeGutter = ({ startHour, endHour }) => {
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );
  const visibleMinutes = (endHour - startHour) * 60;

  return (
    <div className={styles.timeColumn}>
      {hours.map((hour, i) => {
        const topPercent = (i * 60 * 100) / visibleMinutes;
        return (
          <div
            key={hour}
            className={styles.timeLabel}
            style={{ top: `${topPercent}%` }}
          >
            {hour === 12
              ? "12 PM"
              : hour > 12
                ? `${hour - 12} PM`
                : `${hour} AM`}
          </div>
        );
      })}
    </div>
  );
};

const BookingItem = ({
  booking,
  onRemove,
  visibleStartMin,
  visibleMinutes,
  color,
}) => {
  const top =
    ((booking.startMinOfDay - visibleStartMin) / visibleMinutes) * 100;
  const height = (booking.duration / visibleMinutes) * 100;
  const startTime = minutesToTimeString(booking.startMinOfDay);
  const endTime = minutesToTimeString(booking.startMinOfDay + booking.duration);

  return (
    <div
      className={styles.bookingBlock}
      style={{ top: `${top}%`, height: `${height}%`, backgroundColor: color }}
      title={`${startTime} - ${endTime}`}
    >
      <span className={styles.bookingTime}>{startTime}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(booking.id);
        }}
        aria-label="Remove booking"
        className={styles.removeBtn}
      >
        ✕
      </button>
    </div>
  );
};

const HoverPreview = ({ hover, visibleStartMin, visibleMinutes, duration }) => {
  if (!hover.visible) return null;

  const top = ((hover.startMinOfDay - visibleStartMin) / visibleMinutes) * 100;
  const height = (duration / visibleMinutes) * 100;

  return (
    <div
      className={`${styles.hoverOverlay} ${hover.isColliding ? styles.colliding : ""
        }`}
      style={{ top: `${top}%`, height: `${height}%` }}
    />
  );
};

const DayColumn = ({ dayIndex, dateLabel, bookings, ...props }) => {
  const { visibleMinutes, startHour, endHour } = props;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i);

  // Provide some colors for bookings
  const bookingColors = ["#06b6d4", "#f97316", "#8b5cf6", "#10b981", "#ef4444"];

  return (
    <div className={styles.dayColumn}>
      <div className={styles.dayHeader}>{dateLabel}</div>
      <div className={styles.dayGrid}>
        {/* Hour Separator Lines */}
        {hours.map((hourIndex) => (
          <div
            key={hourIndex}
            className={styles.hourLine}
            style={{ top: `${(hourIndex * 60 * 100) / visibleMinutes}%` }}
          />
        ))}

        {/* Bookings */}
        {bookings.map((booking, i) => (
          <BookingItem
            key={booking.id}
            booking={booking}
            color={bookingColors[i % bookingColors.length]}
            {...props}
          />
        ))}

        {/* Hover Preview */}
        {props.hover.dayIndex === dayIndex && (
          <HoverPreview {...props} duration={props.selectedDuration} />
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

export default function CalendarBooking({
  startHour = 7,
  endHour = 23,
  snapMinutes = 5,
}) {
  const [daysToShow, setDaysToShow] = useState(1);
  const durations = [25, 50, 75];
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [bookings, setBookings] = useState([]);
  const [hover, setHover] = useState({ visible: false });
  const gridRef = useRef(null);

  const visibleStartMin = startHour * 60;
  const visibleEndMin = endHour * 60;
  const visibleMinutes = visibleEndMin - visibleStartMin;

  const checkCollision = (newBooking) => {
    return bookings.some(
      (b) =>
        b.dayIndex === newBooking.dayIndex &&
        b.startMinOfDay < newBooking.startMinOfDay + newBooking.duration &&
        b.startMinOfDay + b.duration > newBooking.startMinOfDay
    );
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();

      // Calculate day index from mouse X position
      const dayWidth = rect.width / daysToShow;
      const dayIndex = Math.floor((e.clientX - rect.left) / dayWidth);

      // Calculate time from mouse Y position
      const percent = Math.max(
        0,
        Math.min(1, (e.clientY - rect.top) / rect.height)
      );
      let minutesFromStart = visibleStartMin + percent * visibleMinutes;

      // Snap to the nearest interval and clamp within visible hours
      let startMinOfDay =
        Math.round(minutesFromStart / snapMinutes) * snapMinutes;
      startMinOfDay = Math.max(
        visibleStartMin,
        Math.min(startMinOfDay, visibleEndMin - selectedDuration)
      );

      const potentialBooking = {
        dayIndex,
        startMinOfDay,
        duration: selectedDuration,
      };
      const isColliding = checkCollision(potentialBooking);

      setHover({
        visible: true,
        dayIndex,
        startMinOfDay,
        isColliding,
        pageX: e.pageX,
        pageY: e.pageY,
      });
    },
    [
      daysToShow,
      visibleStartMin,
      visibleMinutes,
      selectedDuration,
      bookings,
      snapMinutes,
    ]
  );

  const addBooking = useCallback(() => {
    if (!hover.visible || hover.isColliding) return;

    const newBooking = {
      id: Date.now() + Math.random(),
      dayIndex: hover.dayIndex,
      startMinOfDay: hover.startMinOfDay,
      duration: selectedDuration,
    };

    setBookings((prev) =>
      [...prev, newBooking].sort((a, b) => a.startMinOfDay - b.startMinOfDay)
    );
  }, [hover, selectedDuration]);

  const removeBooking = (id) => {
    setBookings((b) => b.filter((x) => x.id !== id));
  };

  // Keyboard accessibility
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Enter" && hover.visible) addBooking();
      if (e.key === "Escape") setHover((h) => ({ ...h, visible: false }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hover, addBooking]);

  // Filter the bookings to show only those that match the selected duration.
  const filteredBookings = bookings.filter(
    (booking) => booking.duration === selectedDuration
  );
  // Date labels for headers
  const today = new Date();
  const dateLabel = (offset) =>
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset
    ).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  return (
    <div className={styles.container}>
      {/* Controls */}
      <div className={styles.controls}>
        <div>
          <span className={styles.controlLabel}>Session length</span>
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDuration(d)}
              className={`${styles.btn} ${selectedDuration === d ? styles.active : ""
                }`}
            >
              {d} min
            </button>
          ))}
        </div>
        <div>
          <span className={styles.controlLabel}>Days</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setDaysToShow(n)}
              className={`${styles.btn} ${daysToShow === n ? styles.active : ""
                }`}
            >
              {n} day{n > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={styles.gridWrap}>
        <TimeGutter startHour={startHour} endHour={endHour} />
        <div
          ref={gridRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover((h) => ({ ...h, visible: false }))}
          onClick={addBooking}
          className={`${styles.daysContainer} ${hover.isColliding ? styles.noDrop : ""
            }`}
        >
          {Array.from({ length: daysToShow }).map((_, dayIdx) => (
            <DayColumn
              key={dayIdx}
              dayIndex={dayIdx}
              dateLabel={dateLabel(dayIdx)}
              bookings={filteredBookings.filter((b) => b.dayIndex === dayIdx)}
              hover={hover}
              onRemove={removeBooking}
              visibleStartMin={visibleStartMin}
              visibleMinutes={visibleMinutes}
              startHour={startHour}
              endHour={endHour}
              selectedDuration={selectedDuration}
            />
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hover.visible && (
        <div
          className={styles.hoverTooltip}
          style={{ left: hover.pageX, top: hover.pageY }}
        >
          {minutesToTimeString(hover.startMinOfDay)} -{" "}
          {minutesToTimeString(hover.startMinOfDay + selectedDuration)}
          <span className={styles.tooltipHint}>
            {hover.isColliding ? "Slot unavailable" : "click to book"}
          </span>
        </div>
      )}
    </div>
  );
}


