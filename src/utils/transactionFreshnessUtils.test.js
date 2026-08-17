import assert from "node:assert/strict";
import test from "node:test";
import {
  getAgreementChangedFields,
  getNegotiationChangedFields,
  getOfferChangedFields,
  getPostChangedFields,
  getProposalChangedFields,
  hasFreshnessChanges,
  isConcurrencyConflict,
} from "./transactionFreshnessUtils.js";

test("detects material changes in a post snapshot", () => {
  const previous = {
    basePrice: 450000,
    city: "Hồ Chí Minh",
    remainingQuantity: 3,
    status: "Active",
    product: { damageLevel: "Minor_Damage" },
  };
  const latest = {
    ...previous,
    basePrice: 4500000,
    city: "Hà Nội",
    product: { damageLevel: "Severe_Damage" },
  };

  assert.deepEqual(getPostChangedFields(previous, latest), [
    "giá bài đăng",
    "thành phố",
    "mức độ hư hỏng",
  ]);
});

test("does not report fields omitted by a compact list response", () => {
  assert.deepEqual(
    getPostChangedFields(
      { postId: "post-1", basePrice: 450000 },
      {
        postId: "post-1",
        basePrice: 450000,
        city: "Hà Nội",
        product: { damageLevel: "Minor_Damage" },
      },
    ),
    [],
  );
});

test(
  "does not compare product type name with product type id",
  () => {
    const previous = {
      postId: "post-1",
      basePrice: 450000,
      productTypeName: "Máy hút bụi",
    };
    const latest = {
      postId: "post-1",
      basePrice: 450000,
      productTypeId: "product-type-id-1",
      productTypeName: "Máy hút bụi",
    };

    assert.deepEqual(
      getPostChangedFields(
        previous,
        latest,
      ),
      [],
    );
  },
);

test(
  "prefers matching product type names over inconsistent ids",
  () => {
    const previous = {
      postId: "post-1",
      productTypeId: "list-shape-id",
      productTypeName: "Máy hút bụi",
    };
    const latest = {
      postId: "post-1",
      productTypeId: "detail-shape-id",
      productTypeName: "Máy hút bụi",
    };

    assert.deepEqual(
      getPostChangedFields(
        previous,
        latest,
      ),
      [],
    );
  },
);

test(
  "detects product type change when comparable names differ",
  () => {
    const previous = {
      postId: "post-1",
      productTypeId: "product-type-1",
      productTypeName: "Máy hút bụi",
    };
    const latest = {
      postId: "post-1",
      productTypeId: "product-type-2",
      productTypeName: "Giường ngủ",
    };

    assert.deepEqual(
      getPostChangedFields(
        previous,
        latest,
      ),
      ["loại sản phẩm"],
    );
  },
);

test("detects offer price quantity and status changes without updatedAt", () => {
  assert.deepEqual(
    getOfferChangedFields(
      {
        offerPrice: 500000,
        offerQuantity: 1,
        offerStatus: "Pending",
        canAccept: true,
      },
      {
        offerPrice: 650000,
        offerQuantity: 2,
        offerStatus: "Accepted",
        canAccept: false,
      },
    ),
    [
      "mức giá đề nghị",
      "số lượng đề nghị",
      "trạng thái đề nghị",
      "quyền xử lý đề nghị",
    ],
  );
});

test("detects a proposal that was superseded while the room was stale", () => {
  const proposal = {
    messageId: "message-1",
    offerPrice: 500000,
    offerQuantity: 1,
    offerStatus: "Pending",
  };
  const latestNegotiation = {
    messages: [
      {
        ...proposal,
        offerStatus: "Superseded",
      },
    ],
  };

  assert.deepEqual(
    getProposalChangedFields(proposal, latestNegotiation),
    ["trạng thái đề xuất"],
  );
});

test("detects negotiation and agreement changes", () => {
  assert.deepEqual(
    getNegotiationChangedFields(
      {
        negotiationStatus: "Open",
        currentOfferPrice: 500000,
        currentOfferQuantity: 1,
      },
      {
        negotiationStatus: "Agreed",
        currentOfferPrice: 600000,
        currentOfferQuantity: 1,
      },
    ),
    ["trạng thái phiên thương lượng", "mức giá hiện tại"],
  );

  assert.deepEqual(
    getAgreementChangedFields(
      {
        agreementStatus: "Pending",
        totalAmount: 500000,
        agreementDetails: { address: "A" },
      },
      {
        agreementStatus: "Pending",
        totalAmount: 600000,
        agreementDetails: { address: "B" },
      },
    ),
    ["tổng giá trị thỏa thuận", "điều khoản thỏa thuận"],
  );

  assert.equal(hasFreshnessChanges([], ["đề xuất"]), true);
  assert.equal(isConcurrencyConflict({ response: { status: 409 } }), true);
  assert.equal(isConcurrencyConflict({ response: { status: 400 } }), false);
});
