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
import { Col, ColorPicker, Divider, Form, Input, Row, Select, Switch } from "antd";
import { useEffect } from "react";
import {
  ITEM_COLOR_PATTERN,
  ITEM_LOOKUP_ADD_UNIT_GROUP,
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
 *   unitGroupOptions: { value: number; label: string }[];
 *   vatGroupOptions: { value: number; label: string }[];
 *   itemTypesPending?: boolean;
 *   categoriesPending?: boolean;
 *   brandsPending?: boolean;
 *   unitGroupsPending?: boolean;
 *   vatGroupsPending?: boolean;
 *   onItemTypeChange?: (typeId: number | undefined) => void;
 *   onOpenCategoryDrawer?: () => void;
 *   onOpenBrandDrawer?: () => void;
 *   onOpenUnitGroupDrawer?: () => void;
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
  unitGroupOptions,
  vatGroupOptions,
  itemTypesPending,
  categoriesPending,
  brandsPending,
  unitGroupsPending,
  vatGroupsPending,
  onItemTypeChange,
  onOpenCategoryDrawer,
  onOpenBrandDrawer,
  onOpenUnitGroupDrawer,
  onOpenVatGroupDrawer,
}) {
  const isActive = Form.useWatch("is_active", form);
  const allowSale = Form.useWatch("allow_sale", form);
  const qrEnabled = Form.useWatch("qr_enabled", form);
  const optionalSuffix = t("fieldOptionalSuffix");
  const showPosSection = allowSale !== false;

  useEffect(() => {
    if (allowSale === false) {
      form.setFieldsValue({
        ticket_name: undefined,
        kitchen_name: undefined,
        send_to_kitchen: false,
        qr_enabled: false,
        qr_description: undefined,
        pos_name: undefined,
        color: undefined,
      });
    }
  }, [allowSale, form]);

  useEffect(() => {
    if (qrEnabled === false) {
      form.setFieldsValue({ qr_description: undefined });
    }
  }, [qrEnabled, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      disabled={readOnly}
      requiredMark={false}
      className="item-general-form"
    >
      <Row gutter={[24, 0]}>
        <Col xs={24} md={8}>
          <Form.Item
            name="item_code"
            label={<ResourceDrawerFieldLabel text={t("fieldItemCode")} optional optionalSuffix={optionalSuffix} />}
          >
            <Input placeholder={t("fieldItemCodePlaceholder")} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="name"
            label={<ResourceDrawerFieldLabel text={t("fieldName")} required />}
            rules={[{ required: true, message: t("fieldNameRequired") }]}
          >
            <Input placeholder={t("fieldNamePlaceholder")} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
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
          <Form.Item
            name="plu_code"
            label={<ResourceDrawerFieldLabel text={t("fieldPlu")} optional optionalSuffix={optionalSuffix} />}
          >
            <Input placeholder={t("fieldPluPlaceholder")} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <LookupSelectWithCreate
            form={form}
            name="unit_group_id"
            label={<ResourceDrawerFieldLabel text={t("fieldUnitGroup")} required />}
            readOnly={readOnly}
            addNewSentinel={ITEM_LOOKUP_ADD_UNIT_GROUP}
            addNewLabel={t("fieldUnitGroupAddNew")}
            onAddNew={onOpenUnitGroupDrawer}
            addNewAsLink
            rules={[{ required: true, message: t("fieldUnitGroupRequired") }]}
            options={unitGroupOptions}
            loading={unitGroupsPending}
            placeholder={t("fieldUnitGroupPlaceholder")}
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
        <Col span={24}>
          <Form.Item
            name="description"
            label={<ResourceDrawerFieldLabel text={t("fieldDescription")} optional optionalSuffix={optionalSuffix} />}
          >
            <TextArea rows={4} placeholder={t("fieldDescriptionPlaceholder")} />
          </Form.Item>
        </Col>
      </Row>

      {showPosSection ? (
        <>
          <Divider className="item-general-form-section-divider" titlePlacement="start" plain>
            {t("sectionPosKitchen")}
          </Divider>
          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="ticket_name"
                label={
                  <ResourceDrawerFieldLabel text={t("fieldTicketName")} optional optionalSuffix={optionalSuffix} />
                }
              >
                <Input placeholder={t("fieldTicketNamePlaceholder")} maxLength={120} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="kitchen_name"
                label={
                  <ResourceDrawerFieldLabel text={t("fieldKitchenName")} optional optionalSuffix={optionalSuffix} />
                }
              >
                <Input placeholder={t("fieldKitchenNamePlaceholder")} maxLength={120} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="pos_name"
                label={
                  <ResourceDrawerFieldLabel text={t("fieldPosName")} optional optionalSuffix={optionalSuffix} />
                }
              >
                <Input placeholder={t("fieldPosNamePlaceholder")} maxLength={255} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="color"
                label={
                  <ResourceDrawerFieldLabel text={t("fieldColor")} optional optionalSuffix={optionalSuffix} />
                }
                rules={[
                  {
                    validator: (_, value) => {
                      const v = typeof value === "string" ? value : String(value ?? "");
                      if (!v.trim()) return Promise.resolve();
                      if (!ITEM_COLOR_PATTERN.test(v)) {
                        return Promise.reject(new Error(t("fieldColorInvalid")));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                getValueFromEvent={(color, cssString) => {
                  if (typeof cssString === "string" && cssString.startsWith("#")) return cssString;
                  if (typeof color === "string" && color.startsWith("#")) return color;
                  if (color && typeof color.toHexString === "function") return color.toHexString();
                  return undefined;
                }}
              >
                <ColorPicker format="hex" showText allowClear className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <div className="item-general-form-toggle-cell">
                <ResourceDrawerFieldLabel text={t("fieldSendToKitchen")} help={t("fieldSendToKitchenHelp")} />
                <Form.Item name="send_to_kitchen" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="item-general-form-toggle-cell">
                <ResourceDrawerFieldLabel text={t("fieldQrEnabled")} help={t("fieldQrEnabledHelp")} />
                <Form.Item name="qr_enabled" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </div>
            </Col>
            <Col span={24}>
              <Form.Item
                name="qr_description"
                label={<ResourceDrawerFieldLabel text={t("fieldQrDescription")} required={qrEnabled === true} />}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!getFieldValue("allow_sale") || !getFieldValue("qr_enabled")) {
                        return Promise.resolve();
                      }
                      if (String(value ?? "").trim().length > 0) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t("fieldQrDescriptionRequired")));
                    },
                  }),
                ]}
              >
                <TextArea
                  rows={3}
                  disabled={qrEnabled !== true}
                  placeholder={t("fieldQrDescriptionPlaceholder")}
                  maxLength={1000}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        </>
      ) : null}

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
