"use client";

/**
 * General tab form — name, type, category, brand, UOM, VAT, pricing, and related fields.
 *
 * Used by:
 * - drawer/hooks/useItemDrawerTabItems.js
 */

import LookupSelectWithCreate from "@/components/resource-drawer/LookupSelectWithCreate";
import LookupTreeSelectWithCreate from "@/components/resource-drawer/LookupTreeSelectWithCreate";
import ResourceDrawerFieldLabel from "@/components/resource-drawer/ResourceDrawerFieldLabel";
import { Col, Form, Input, Row, Select, Switch } from "antd";
import {
  ITEM_LOOKUP_ADD_BASE_UOM,
  ITEM_LOOKUP_ADD_BRAND,
  ITEM_LOOKUP_ADD_CATEGORY,
  ITEM_LOOKUP_ADD_VAT_GROUP,
} from "../utils/itemDrawerConstants";

const { TextArea } = Input;

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   itemTypeOptions: { value: number; label: string; code: string }[];
 *   categoryTreeData: import("antd").TreeSelectProps["treeData"];
 *   brandOptions: { value: number; label: string }[];
 *   uomOptions: { value: number; label: string }[];
 *   vatGroupOptions: { value: number; label: string }[];
 *   itemTypesPending?: boolean;
 *   categoriesPending?: boolean;
 *   brandsPending?: boolean;
 *   uomsPending?: boolean;
 *   vatGroupsPending?: boolean;
 *   onItemTypeChange?: (typeId: number | undefined) => void;
 *   onOpenCategoryDrawer?: () => void;
 *   onOpenBrandDrawer?: () => void;
 *   onOpenBaseUomDrawer?: () => void;
 *   onOpenVatGroupDrawer?: () => void;
 * }} props
 */
export default function ItemDrawerGeneralForm({
  form,
  readOnly,
  t,
  itemTypeOptions,
  categoryTreeData,
  brandOptions,
  uomOptions,
  vatGroupOptions,
  itemTypesPending,
  categoriesPending,
  brandsPending,
  uomsPending,
  vatGroupsPending,
  onItemTypeChange,
  onOpenCategoryDrawer,
  onOpenBrandDrawer,
  onOpenBaseUomDrawer,
  onOpenVatGroupDrawer,
}) {
  const isActive = Form.useWatch("is_active", form);
  const optionalSuffix = t("fieldOptionalSuffix");

  return (
    <Form
      form={form}
      layout="vertical"
      disabled={readOnly}
      requiredMark={false}
      className="item-general-form"
    >
      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="sku"
            label={<ResourceDrawerFieldLabel text={t("fieldSku")} required />}
            rules={[{ required: true, message: t("fieldSkuRequired") }]}
          >
            <Input placeholder={t("fieldSkuPlaceholder")} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="name"
            label={<ResourceDrawerFieldLabel text={t("fieldName")} required />}
            rules={[{ required: true, message: t("fieldNameRequired") }]}
          >
            <Input placeholder={t("fieldNamePlaceholder")} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="plu_code"
            label={<ResourceDrawerFieldLabel text={t("fieldPlu")} optional optionalSuffix={optionalSuffix} />}
          >
            <Input placeholder={t("fieldPluPlaceholder")} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="item_type_id"
            label={<ResourceDrawerFieldLabel text={t("fieldItemType")} required />}
            rules={[{ required: true, message: t("fieldItemTypeRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={itemTypesPending}
              options={itemTypeOptions}
              placeholder={t("fieldItemTypePlaceholder")}
              onChange={(v) => onItemTypeChange?.(v)}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <LookupTreeSelectWithCreate
            form={form}
            name="category_id"
            label={<ResourceDrawerFieldLabel text={t("fieldCategory")} required />}
            readOnly={readOnly}
            addNewSentinel={ITEM_LOOKUP_ADD_CATEGORY}
            addNewLabel={t("fieldCategoryAddNew")}
            onAddNew={onOpenCategoryDrawer}
            addNewAsLink
            rules={[{ required: true, message: t("fieldCategoryRequired") }]}
            treeData={categoryTreeData}
            loading={categoriesPending}
            placeholder={t("fieldCategoryPlaceholder")}
            allowClear={false}
          />
        </Col>
        <Col xs={24} md={12}>
          <LookupSelectWithCreate
            form={form}
            name="brand_id"
            label={<ResourceDrawerFieldLabel text={t("fieldBrand")} optional optionalSuffix={optionalSuffix} />}
            readOnly={readOnly}
            addNewSentinel={ITEM_LOOKUP_ADD_BRAND}
            addNewLabel={t("fieldBrandAddNew")}
            onAddNew={onOpenBrandDrawer}
            addNewAsLink
            options={brandOptions}
            loading={brandsPending}
            placeholder={t("fieldBrandPlaceholder")}
          />
        </Col>
        <Col xs={24} md={12}>
          <LookupSelectWithCreate
            form={form}
            name="base_uom_id"
            label={<ResourceDrawerFieldLabel text={t("fieldBaseUom")} required />}
            readOnly={readOnly}
            addNewSentinel={ITEM_LOOKUP_ADD_BASE_UOM}
            addNewLabel={t("fieldBaseUomAddNew")}
            onAddNew={onOpenBaseUomDrawer}
            addNewAsLink
            rules={[{ required: true, message: t("fieldBaseUomRequired") }]}
            options={uomOptions}
            loading={uomsPending}
            placeholder={t("fieldBaseUomPlaceholder")}
            allowClear={false}
          />
        </Col>
        <Col xs={24} md={12}>
          <LookupSelectWithCreate
            form={form}
            name="vat_group_id"
            label={<ResourceDrawerFieldLabel text={t("fieldVatGroup")} optional optionalSuffix={optionalSuffix} />}
            readOnly={readOnly}
            addNewSentinel={ITEM_LOOKUP_ADD_VAT_GROUP}
            addNewLabel={t("fieldVatGroupAddNew")}
            onAddNew={onOpenVatGroupDrawer}
            addNewAsLink
            options={vatGroupOptions}
            loading={vatGroupsPending}
            placeholder={t("fieldVatGroupPlaceholder")}
          />
        </Col>
        <Col span={24}>
          <Form.Item
            name="description"
            label={<ResourceDrawerFieldLabel text={t("fieldDescription")} optional optionalSuffix={optionalSuffix} />}
          >
            <TextArea rows={4} placeholder={t("fieldDescriptionPlaceholder")} />
          </Form.Item>
        </Col>
      </Row>

      <div className="item-general-form-toggles" role="group" aria-label={t("fieldStatus")}>
        <div className="item-general-form-toggle-cell">
          <ResourceDrawerFieldLabel text={t("fieldTrackInventory")} help={t("fieldTrackInventoryHelp")} />
          <Form.Item name="track_inventory" valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </div>
        <div className="item-general-form-toggle-cell">
          <ResourceDrawerFieldLabel text={t("fieldAllowSale")} help={t("fieldAllowSaleHelp")} />
          <Form.Item name="allow_sale" valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </div>
        <div className="item-general-form-toggle-cell">
          <ResourceDrawerFieldLabel text={t("fieldAllowPurchase")} help={t("fieldAllowPurchaseHelp")} />
          <Form.Item name="allow_purchase" valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </div>
        <div className="item-general-form-toggle-cell item-general-form-toggle-cell--status">
          <ResourceDrawerFieldLabel text={t("fieldStatus")} help={t("fieldStatusHelp")} />
          <div className="item-general-form-status-control">
            <Form.Item name="is_active" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
            <span className="item-general-form-status-text">
              {isActive ? t("statusActive") : t("statusInactive")}
            </span>
          </div>
        </div>
      </div>
    </Form>
  );
}
