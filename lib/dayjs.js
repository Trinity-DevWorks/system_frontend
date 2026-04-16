/**
 * Shared Day.js setup.
 * Used to preload supported locales and export a single configured instance.
 */
import dayjs from "dayjs";
import "dayjs/locale/ar";
import "dayjs/locale/en";

dayjs.locale("en");

export default dayjs;
