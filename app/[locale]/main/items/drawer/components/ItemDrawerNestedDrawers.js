/**
 * Nested category, brand, UOM, and VAT group drawers opened from general-tab lookups.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import CategoryDrawer from "@/app/[locale]/main/categories/drawer/CategoryDrawer";
import BrandDrawer from "@/app/[locale]/main/brands/drawer/BrandDrawer";
import UnitOfMeasurementDrawer from "@/app/[locale]/main/unit-of-measurements/drawer/UnitOfMeasurementDrawer";
import VatGroupDrawer from "@/app/[locale]/main/vat-groups/drawer/VatGroupDrawer";

/**
 * @param {{
 *   readOnly: boolean;
 *   nestedCategoryDrawerOpen: boolean;
 *   nestedBrandDrawerOpen: boolean;
 *   nestedUomDrawerOpen: boolean;
 *   nestedVatGroupDrawerOpen: boolean;
 *   closeNestedCreate: () => void;
 *   onNestedCategoryCreated: (record: Record<string, unknown>) => void;
 *   onNestedBrandCreated: (record: Record<string, unknown>) => void;
 *   onNestedBaseUomCreated: (record: Record<string, unknown>) => void;
 *   onNestedVatGroupCreated: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function ItemDrawerNestedDrawers({
  readOnly,
  nestedCategoryDrawerOpen,
  nestedBrandDrawerOpen,
  nestedUomDrawerOpen,
  nestedVatGroupDrawerOpen,
  closeNestedCreate,
  onNestedCategoryCreated,
  onNestedBrandCreated,
  onNestedBaseUomCreated,
  onNestedVatGroupCreated,
}) {
  if (readOnly) return null;

  return (
    <>
      <CategoryDrawer
        open={nestedCategoryDrawerOpen}
        mode="create"
        categoryId={null}
        onClose={closeNestedCreate}
        onCreateSuccess={onNestedCategoryCreated}
      />
      <BrandDrawer
        open={nestedBrandDrawerOpen}
        mode="create"
        brandId={null}
        onClose={closeNestedCreate}
        onCreateSuccess={onNestedBrandCreated}
      />
      <UnitOfMeasurementDrawer
        open={nestedUomDrawerOpen}
        mode="create"
        unitOfMeasurementId={null}
        onClose={closeNestedCreate}
        onCreateSuccess={onNestedBaseUomCreated}
      />
      <VatGroupDrawer
        open={nestedVatGroupDrawerOpen}
        mode="create"
        vatGroupId={null}
        onClose={closeNestedCreate}
        onCreateSuccess={onNestedVatGroupCreated}
      />
    </>
  );
}
