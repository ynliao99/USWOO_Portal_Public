<template>
  <div ref="calendarEl" class="calendar-container" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // Needed for eventClick, etc.
import type {
  EventApi,
  EventClickArg,
  EventContentArg
} from "@fullcalendar/core";
import tippy from "tippy.js";
import type { Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css"; // Import Tippy CSS
import { http } from "@/utils/http"; // Import your http utility
import "bootstrap-icons/font/bootstrap-icons.css"; // Import close icon
// --- Component Name (Optional but good practice) ---
defineOptions({
  name: "CalendarComponent" // Renamed slightly to avoid conflict with HTML <calendar>
});

// --- Define Props ---
interface Props {
  showToolbar?: boolean; // Optional boolean prop
  maxheight?: string; // Optional string prop for CSS max-height value
}

const props = withDefaults(defineProps<Props>(), {
  showToolbar: true, // Default: show the toolbar
  maxheight: "90vh" // Default: max-height is 90% of viewport height
});

// --- Interfaces ---
interface ApiEventData {
  id: string | number;
  location: string;
  unit: string;
  address: string;
  startTime: string; // e.g., "2025-02-22 10:00:00"
  endTime: string; // e.g., "2025-02-22 11:00:00"
  agentName: string;
  note?: string;
  customerSex: string;
  customerIdentity: string;
  customerTarget: string;
  dropped: string; // "0" or other values
}

interface CalendarExtendedProps {
  agentName: string;
  address: string;
  note: string;
  startTime: string;
  endTime: string;
  customerSex: string;
  customerIdentity: string;
  customerTarget: string;
}

// --- Refs ---
const calendarEl = ref<HTMLDivElement | null>(null);
const calendarInstance = ref<Calendar | null>(null);
const activeTippyInstances = ref<TippyInstance[]>([]);

// --- Helper Functions ---

// Time formatting function (ported from original HTML)
function formatEventTime(startStr: string, endStr: string): string {
  // Replace hyphens with slashes for broader browser compatibility with Date constructor
  const startDate = new Date(startStr.replace(/-/g, "/"));
  const endDate = new Date(endStr.replace(/-/g, "/"));

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error("Invalid date format provided:", startStr, endStr);
    return "Invalid date";
  }

  const month = startDate.getMonth() + 1;
  const day = startDate.getDate();
  const weekdays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六"
  ];
  const weekday = weekdays[startDate.getDay()];

  const formatHour = (hour: number): number => {
    const h = hour % 12;
    return h === 0 ? 12 : h;
  };

  const period = startDate.getHours() < 12 ? "上午" : "下午";
  const startHour = startDate.getHours();
  const startMin = startDate.getMinutes();
  const endHour = endDate.getHours();
  const endMin = endDate.getMinutes();

  const formattedStart = `${period}${formatHour(startHour)}:${(startMin < 10 ? "0" : "") + startMin}`;
  const formattedEnd = `${formatHour(endHour)}:${(endMin < 10 ? "0" : "") + endMin}`;

  return `${month}月 ${day}日 (${weekday}) ${formattedStart} - ${formattedEnd}`;
}

// Function to initialize Tippy for an event
const initializeTippy = (
  info: EventClickArg | { el: HTMLElement; event: EventApi }
) => {
  const eventEl = info.el;
  const event = info.event;
  const props = event.extendedProps as CalendarExtendedProps;

  // Prevent duplicate tippy instances on the same element
  if ((eventEl as any)._tippy) {
    return; // Already initialized
  }

  // Format time
  const formattedTime = formatEventTime(props.startTime, props.endTime);

  // Construct customer info string
  const customerDetails = [
    props.customerSex,
    props.customerIdentity,
    props.customerTarget
  ]
    .filter(Boolean)
    .join("，"); // Use Chinese comma
  const customerInfo = `客户信息：${customerDetails}<br>${props.note || ""}`;

  // Construct Google Maps URL
  // Use maps.google.com for broader compatibility, ensure address is encoded
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(props.address)}`;

  // Construct popover content
  const contentHTML = `
    <div class="custom-popover">
      <div class="popover-header">
        <button class="popover-close" aria-label="Close">×</button>
      </div>
      <div class="popover-title">${event.title}</div>
      <div class="popover-line">
        <i class="bi bi-clock"></i> ${formattedTime}
      </div>
      <div class="popover-line">
        <i class="bi bi-geo-alt"></i>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${props.address}</a>
      </div>
      <div class="popover-line">
        <i class="bi bi-person"></i> ${props.agentName}
      </div>
      <div class="popover-line">
        <i class="bi bi-info-circle"></i> ${customerInfo}
      </div>
    </div>
  `;

  // Calculate offset for edge cases (ported from original)
  const calendarRect = calendarEl.value?.getBoundingClientRect();
  const eventRect = eventEl.getBoundingClientRect();
  let offsetX = 0;
  if (calendarRect) {
    const margin = 40; // Minimum distance from edge
    if (eventRect.left < calendarRect.left + margin) {
      // Too close to left edge, shift popover right
      offsetX = calendarRect.left + margin / 2 - eventRect.left + 10; // Added slight extra offset
    } else if (eventRect.right > calendarRect.right - margin) {
      // Too close to right edge, shift popover left
      offsetX = calendarRect.right - margin - eventRect.right - 10; // Added slight extra offset
    }
  }

  // Initialize Tippy
  const instance = tippy(eventEl, {
    content: contentHTML,
    allowHTML: true,
    trigger: "manual", // We will show it manually on click
    interactive: true,
    hideOnClick: true, // Hide when clicking *outside* the popover
    theme: "custom", // Use our custom theme defined in CSS
    appendTo: document.body, // Append to body to avoid clipping issues
    placement: "auto",
    popperOptions: {
      modifiers: [
        { name: "offset", options: { offset: [offsetX, 10] } }, // Use calculated horizontal offset, 10px vertical
        { name: "preventOverflow", options: { padding: 10 } } // Add padding to prevent overflow checks
      ],
      strategy: "fixed" // Helps with positioning when container scrolls
    },
    onShow(instance) {
      // Close other active Tippy instances
      activeTippyInstances.value.forEach(tip => {
        if (tip.id !== instance.id) tip.hide();
      });
      activeTippyInstances.value = [instance]; // Keep track of the current one

      // Add highlight class to the event element
      eventEl.classList.add("event-highlight");
    },
    onHide(instance) {
      // Remove highlight class
      eventEl.classList.remove("event-highlight");
      // Remove from active list
      activeTippyInstances.value = activeTippyInstances.value.filter(
        tip => tip.id !== instance.id
      );
    },
    onShown(instance) {
      // Add click listener to the custom close button *inside* the popover
      const closeButton = instance.popper.querySelector(".popover-close");
      if (closeButton) {
        // Use a dedicated handler to remove it later if needed
        const closeHandler = (e: MouseEvent) => {
          e.stopPropagation(); // Prevent event bubbling
          instance.hide();
        };
        // Store handler reference if you need to remove it specifically later
        (closeButton as any).__closeHandler = closeHandler;
        closeButton.addEventListener("click", closeHandler);
      }
    },
    onHidden(instance) {
      // Optional: Clean up close button listener if necessary, though Tippy destroy should handle it
      const closeButton = instance.popper.querySelector(".popover-close");
      if (closeButton && (closeButton as any).__closeHandler) {
        closeButton.removeEventListener(
          "click",
          (closeButton as any).__closeHandler
        );
        delete (closeButton as any).__closeHandler;
      }
    },
    onDestroy(instance) {
      // Ensure it's removed from active list on destruction
      activeTippyInstances.value = activeTippyInstances.value.filter(
        tip => tip.id !== instance.id
      );
    }
  });

  // Show the Tippy instance manually since trigger is 'manual'
  instance.show();
};

// --- Lifecycle Hooks ---

onMounted(() => {
  // Ensure the DOM element is available
  if (calendarEl.value) {
    const calendar = new Calendar(calendarEl.value, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: "dayGridMonth",
      headerToolbar: props.showToolbar
        ? {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
          }
        : false, // Set based on prop
      dayMaxEvents: true, // allow "more" link when too many events
      events: async (fetchInfo, successCallback, failureCallback) => {
        try {
          // Use the http utility
          // Adjust the URL and expected response type as needed
          const response = await http.get<ApiEventData[], ApiEventData[]>(
            "/portalapi/calendar/calendar_process.php?action=view"
          );

          // Check if response is in the expected format (array)
          if (!Array.isArray(response)) {
            console.error("API response is not an array:", response);
            throw new Error("Invalid data format from API");
          }

          // Filter and map events (ported from original)
          const filteredData = response.filter(item => item.dropped === "0");
          const events = filteredData.map(item => ({
            id: String(item.id), // Ensure ID is a string for FullCalendar
            title: [item.location, item.unit].filter(Boolean).join(" - "), // Ignore empty parts
            start: item.startTime.replace(" ", "T"), // Use ISO 8601 format if possible
            end: item.endTime.replace(" ", "T"), // Use ISO 8601 format if possible
            extendedProps: {
              agentName: item.agentName,
              address: item.address,
              note: item.note || "",
              startTime: item.startTime,
              endTime: item.endTime,
              customerSex: item.customerSex,
              customerIdentity: item.customerIdentity,
              customerTarget: item.customerTarget
            } as CalendarExtendedProps
          }));
          successCallback(events);
        } catch (error) {
          console.error("Error fetching calendar events:", error);
          failureCallback(error as Error); // Pass the error object
        }
      },
      // Use eventClick instead of eventDidMount for popover logic
      eventClick: (clickInfo: EventClickArg) => {
        initializeTippy(clickInfo);
      },
      // Optional: Customize event rendering slightly if needed
      // eventContent: (arg: EventContentArg) => {
      //   // You could customize the inner HTML of event elements here if needed
      // },

      // Ensure calendar updates dimensions if container resizes
      windowResize: function (view) {
        calendar.updateSize();
      }
    });

    calendarInstance.value = calendar;
    calendar.render();
  } else {
    console.error("Calendar container element not found.");
  }
});

onBeforeUnmount(() => {
  // Destroy all active Tippy instances
  activeTippyInstances.value.forEach(instance => instance.destroy());
  activeTippyInstances.value = [];

  // Destroy the FullCalendar instance
  if (calendarInstance.value) {
    calendarInstance.value.destroy();
    calendarInstance.value = null;
  }
});
</script>

<style>
/* Global styles for Tippy popover - these NEED to be unscoped */

/* because the popover is appended to document.body */

/* Custom Tippy theme container */
.tippy-box[data-theme~="custom"] {
  max-width: 450px !important; /* Allow wider popovers if needed */
  background-color: transparent;
  border: none;
  border-radius: 10px; /* Apply border-radius here too */
  box-shadow: none;
}

/* Custom popover styling */
.custom-popover {
  min-width: 320px;
  padding: 15px 20px; /* Adjusted padding */
  color: black;
  text-align: left; /* Ensure text is left-aligned */
  user-select: text; /* Allow text selection */
  background: #f0f4f9;
  border: 1px solid #ddd;
  border-radius: 10px; /* Match outer radius */
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

/* Ensure all elements inside allow selection */
.custom-popover * {
  user-select: text;
}

/* Popover header for close button */
.popover-header {
  display: flex;
  justify-content: flex-end;
  padding-top: 0; /* No extra padding */
  margin-bottom: 5px; /* Reduced margin */
}

.popover-close {
  padding: 0 5px; /* Add some padding for easier clicking */
  font-size: 24px; /* Slightly larger */
  line-height: 1;
  color: #666;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px; /* Add slight rounding */
  transition:
    color 0.2s,
    transform 0.2s;
}

.popover-close:hover {
  color: #000;
  background-color: #e7eaef;
  transform: scale(1.1);
}

.popover-close:active {
  color: #000;
  background-color: #d0d4d9;
  transform: scale(0.95);
}

.popover-title {
  margin-bottom: 12px;
  font-size: 18px; /* Adjusted size */
  font-weight: bold;
  color: #333;
}

.popover-line {
  display: flex;
  align-items: flex-start; /* Align items top for potentially long text */
  padding: 4px 0; /* Reduced padding, focus on margin */
  margin-bottom: 10px; /* Slightly more spacing */
  font-size: 14px;
  color: #444;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.popover-line:last-child {
  margin-bottom: 0; /* No margin on last line */
}

/* No hover effect on lines by default, keep it clean */

/* .popover-line:hover {
  background-color: #e7eaef;
} */

.popover-line i {
  flex-shrink: 0; /* Prevent icon from shrinking */
  margin-top: 2px; /* Align icon slightly better with text */
  margin-right: 8px; /* More space for icon */
  font-size: 16px; /* Slightly larger icons */
  color: #555; /* Icon color */
}

.custom-popover a {
  color: #007bff;
  word-break: break-all; /* Break long links/addresses */
  text-decoration: none;
}

.custom-popover a:hover {
  text-decoration: underline;
}

/* Ensure tippy has high z-index */
.tippy-box {
  z-index: 9999 !important;
}
</style>

<style scoped>
/* Scoped styles for the component container and FullCalendar elements */
.calendar-container {
  /* stylelint-disable-next-line function-no-unknown */
  max-height: v-bind(props.maxheight);
  padding: 10px;
  background-color: #fff;
}

/* Apply deep selector for FullCalendar elements */

/* because they are rendered inside this component */

/* but their classes are generated by FullCalendar */

/* Event cursor */
:deep(.fc-event) {
  cursor: pointer;
  transition: box-shadow 0.2s ease-in-out; /* Add transition */
}

/* Event dot color */
:deep(.fc-daygrid-event-dot) {
  border: calc(var(--fc-daygrid-event-dot-width, 8px) / 2) solid #fc676e;
}

/* Button base styles */
:deep(.fc-button) {
  color: #fff !important;
  text-transform: capitalize; /* Nicer button text */
  background-color: #fc676e !important;
  border-color: #fc676e !important;
  transition:
    background-color 0.2s,
    border-color 0.2s; /* Smooth transitions */
}

/* Button hover state */
:deep(.fc-button:hover) {
  background-color: #fa7b82 !important;
  border-color: #fa7b82 !important;
}

/* Button active/focus state */
:deep(.fc-button:active),
:deep(.fc-button:focus),
:deep(.fc-button-active) {
  /* Current view button */
  background-color: #f65a5f !important;
  border-color: #f65a5f !important;
  box-shadow: none !important; /* Remove default focus shadow if needed */
}

/* Event highlight effect (applied via JS) */
:deep(.event-highlight) {
  position: relative; /* Needed for z-index */

  /* Or use border: 2px solid #007bff; */
  z-index: 10; /* Bring highlighted event slightly forward */

  /* Use a border or brighter box-shadow for highlight */
  box-shadow: 0 0 0 3px rgb(0 123 255 / 50%);
}

:deep(.fc-header-toolbar) {
  margin-bottom: 1em;
}
</style>
