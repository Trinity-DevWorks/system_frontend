"use client";

import { useImageGalleryBlobs } from "@/shared/components/attachments/useImageGalleryBlobs";
import { Spin } from "antd";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import "yet-another-react-lightbox/styles.css";

/**
 * @param {{
 *   recordId: number;
 *   images: { id: number; file_name: string }[];
 *   initialIndex: number;
 *   viewBlob: (recordId: number, attachmentId: number) => Promise<Blob>;
 *   onClose: () => void;
 * }} props
 */
export default function ImageGalleryViewer({ recordId, images, initialIndex, viewBlob, onClose }) {
  const { index, slides, onSlideView } = useImageGalleryBlobs({
    recordId,
    images,
    initialIndex,
    viewBlob,
  });

  return (
    <Lightbox
      open
      index={index}
      close={onClose}
      slides={slides}
      plugins={[Zoom, Fullscreen]}
      carousel={{ finite: images.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      on={{ view: ({ index: nextIndex }) => onSlideView(nextIndex) }}
      styles={{ container: { backgroundColor: "rgba(0,0,0,0.92)" } }}
      render={{
        slide: ({ slide }) => {
          if (slide.src) return undefined;
          return (
            <div className="flex min-h-[50vh] w-full items-center justify-center">
              <Spin size="large" />
            </div>
          );
        },
      }}
    />
  );
}
