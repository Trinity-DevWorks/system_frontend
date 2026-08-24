/**
 * Nested category, brand, unit group, and VAT group drawers opened from general-tab lookups.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import CategoryDrawer from "@/features/categories/components/CategoryDrawer/CategoryDrawer";
import BrandDrawer from "@/features/brands/components/BrandDrawer/BrandDrawer";
import UnitGroupDrawer from "@/features/unit-groups/components/UnitGroupDrawer/UnitGroupDrawer";
import VatGroupDrawer from "@/features/vat-groups/components/VatGroupDrawer/VatGroupDrawer";

/**
 * @param {{
 *   readOnly: boolean;
 *   nestedCategoryDrawerOpen: boolean;
 *   nestedBrandDrawerOpen: boolean;
 *   nestedUnitGroupDrawerOpen: boolean;
 *   nestedVatGroupDrawerOpen: boolean;
 *   closeNestedCreate: () => void;
 *   onNestedCategoryCreated: (record: Record<string, unknown>) => void;
 *   onNestedBrandCreated: (record: Record<string, unknown>) => void;
 *   onNestedUnitGroupCreated: (record: Record<string, unknown>) => void;
 *   onNestedVatGroupCreated: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function ItemDrawerNestedDrawers({
  readOnly,
  nestedCategoryDrawerOpen,
  nestedBrandDrawerOpen,
  nestedUnitGroupDrawerOpen,
  nestedVatGroupDrawerOpen,
  closeNestedCreate,
  onNestedCategoryCreated,
  onNestedBrandCreated,
  onNestedUnitGroupCreated,
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
      <UnitGroupDrawer
        open={nestedUnitGroupDrawerOpen}
        mode="create"
        unitGroupId={null}
        onClose={closeNestedCreate}
        onCreateSuccess={onNestedUnitGroupCreated}
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
