import exec from "k6/execution";
import { check, sleep, fail } from "k6";
import { Counter, Trend } from "k6/metrics";
import { parseHTML } from "k6/html";
import { browser } from "k6/experimental/browser";
import { createClientUrl } from "../utils.js";

const completedImageCount = new Counter("completed_load_image_count");

// 画像の読み込みが完了している数をカウント
const countCompletedImage = async (page) => {
  const htmlContent = await page.locator("#order-table").innerHTML();
  const doc = parseHTML(htmlContent).get(0);
  const images = doc.querySelectorAll("img");
  images.forEach((image) => {
    if (image.getAttribute("alt").includes("(completed)")) {
      completedImageCount.add(1);
    }
  });
};

// 2から7までの範囲に基づいてTrendメトリクスを配列に格納
const loginTime = [];
const loginSuccessCounter = [];
const loginFailCounter = [];
const getPendingOrdersTime = [];
const getPendingOrdersSuccessCounter = [];
const getPendingOrdersFailCounter = [];
const getOrderDetailsTime = [];
const getOrderDetailsSuccessCounter = [];
const getOrderDetailsFailCounter = [];
const getNearestTowTruckTime = [];
const getNearestTowTruckSuccessCounter = [];
const getNearestTowTruckFailCounter = [];
const orderDispatchTime = [];
const orderDispatchSuccessCounter = [];
const orderDispatchFailCounter = [];
const logoutTime = [];
const logoutSuccessCounter = [];
const logoutFailCounter = [];

for (let i = 2; i <= 7; i++) {
  loginTime.push(new Trend(`login_time_area${i}`, true));
  loginSuccessCounter.push(new Counter(`login_success_count_area${i}`));
  loginFailCounter.push(new Counter(`login_fail_count_area${i}`));
  getPendingOrdersTime.push(
    new Trend(`get_pending_orders_time_area${i}`, true)
  );
  getPendingOrdersSuccessCounter.push(
    new Counter(`get_pending_orders_success_count_area${i}`)
  );
  getPendingOrdersFailCounter.push(
    new Counter(`get_pending_orders_fail_count_area${i}`)
  );
  getOrderDetailsTime.push(new Trend(`get_order_details_time_area${i}`, true));
  getOrderDetailsSuccessCounter.push(
    new Counter(`get_order_details_success_count_area${i}`)
  );
  getOrderDetailsFailCounter.push(
    new Counter(`get_order_details_fail_count_area${i}`)
  );
  getNearestTowTruckTime.push(
    new Trend(`get_nearest_tow_truck_time_area${i}`, true)
  );
  getNearestTowTruckSuccessCounter.push(
    new Counter(`get_nearest_tow_truck_success_count_area${i}`)
  );
  getNearestTowTruckFailCounter.push(
    new Counter(`get_nearest_tow_truck_fail_count_area${i}`)
  );
  orderDispatchTime.push(new Trend(`order_dispatch_time_area${i}`, true));
  orderDispatchSuccessCounter.push(
    new Counter(`order_dispatch_success_count_area${i}`)
  );
  orderDispatchFailCounter.push(
    new Counter(`order_dispatch_fail_count_area${i}`)
  );
  logoutTime.push(new Trend(`logout_time_area${i}`, true));
  logoutSuccessCounter.push(new Counter(`logout_success_count_area${i}`));
  logoutFailCounter.push(new Counter(`logout_fail_count_area${i}`));
}

export default async function dispatchTowTruck() {
  const areaId = Number(__ENV.AREA);

  const page = browser.newPage();

  try {
    // ログイン処理
    await page.goto(createClientUrl("/login"));
    const usernameInput = page.locator("#input-username");
    const passwordInput = page.locator("#input-password");
    const loginButton = page.locator("#button-login");
    const username = `dispatcher${areaId}_${
      (exec.scenario.iterationInInstance % 10) + 1
    }`;
    usernameInput.type(username);
    passwordInput.type("password");

    const loginStartTime = new Date().getTime();

    await Promise.all([page.waitForNavigation(), loginButton.click()]);

    const loginEndTime = new Date().getTime();
    const loginCheck = check(page, {
      login_success: (p) =>
        p.locator("h2").textContent() === "レッカー車配車アプリケーション",
    });

    if (loginCheck) {
      loginSuccessCounter[areaId - 2].add(1);
      loginTime[areaId - 2].add(loginEndTime - loginStartTime);
    } else {
      loginFailCounter[areaId - 2].add(1);
      fail();
    }

    // リクエスト一覧ページへ移動
    const requestsPageButton = page.locator("#button-requests-page");

    const getPendingOrdersStartTime = new Date().getTime();

    await Promise.all([page.waitForNavigation(), requestsPageButton.click()]);

    const getPendingOrdersEndTime = new Date().getTime();

    const getPendingOrdersCheck = check(page, {
      get_pending_orders_success: (p) =>
        p.locator("h2").textContent() === "リクエスト一覧",
    });
    if (getPendingOrdersCheck) {
      getPendingOrdersSuccessCounter[areaId - 2].add(1);
      getPendingOrdersTime[areaId - 2].add(
        getPendingOrdersEndTime - getPendingOrdersStartTime
      );
    } else {
      getPendingOrdersFailCounter[areaId - 2].add(1);
      fail();
    }

    sleep(2); // 画像の読み込みのため3秒間待機
    await countCompletedImage(page);

    // リクエスト詳細画面へ移動
    const topRequestLink = page.locator("tbody tr:nth-child(1)");

    const getOrderDetailsStartTime = new Date().getTime();

    await Promise.all([page.waitForNavigation(), topRequestLink.click()]);

    const getOrderDetailsEndTime = new Date().getTime();

    const getOrderDetailsCheck = check(page, {
      get_detail_order_success: (p) =>
        p.locator("h2").textContent() === "リクエスト詳細",
    });

    if (getOrderDetailsCheck) {
      getOrderDetailsSuccessCounter[areaId - 2].add(1);
      getOrderDetailsTime[areaId - 2].add(
        getOrderDetailsEndTime - getOrderDetailsStartTime
      );
    } else {
      getOrderDetailsFailCounter[areaId - 2].add(1);
      fail();
    }

    // 最寄りのレッカー車を取得
    const fetchNearestButton = page.locator("#button-get-nearest");

    const getNearestTowTruckStartTime = new Date().getTime();

    await Promise.resolve(fetchNearestButton.click());
    page
      .locator("div[role='dialog']")
      .waitFor({ state: "visible", timeout: 5000 });

    const getNearestTowTruckEndTime = new Date().getTime();

    const getNearestTowTruckCheck = check(page, {
      get_nearest_tow_truck: (p) =>
        /^[0-9]+$/.test(p.locator("#tow-truck-id").textContent()),
    });

    if (getNearestTowTruckCheck) {
      getNearestTowTruckSuccessCounter[areaId - 2].add(1);
      getNearestTowTruckTime[areaId - 2].add(
        getNearestTowTruckEndTime - getNearestTowTruckStartTime
      );
    } else {
      getNearestTowTruckFailCounter[areaId - 2].add(1);
      fail();
    }

    // レッカー車を手配する操作
    const orderDispatchButton = page.locator("#button-order-dispatch");

    const orderDispatchStartTime = new Date().getTime();

    await Promise.resolve(orderDispatchButton.click());

    page.locator("#dispatch-message-snackbar").waitFor({ state: "visible" });

    const orderDispatchEndTime = new Date().getTime();

    const orderDispatchCheck = check(page, {
      order_dispatch_success: (p) =>
        p.locator("#order-status").textContent() === "dispatched",
    });

    if (orderDispatchCheck) {
      orderDispatchSuccessCounter[areaId - 2].add(1);
      orderDispatchTime[areaId - 2].add(
        orderDispatchEndTime - orderDispatchStartTime
      );
    } else {
      orderDispatchFailCounter[areaId - 2].add(1);
      fail();
    }

    // ログアウト操作
    await page.goto(createClientUrl("/"));
    const logoutButton = page.locator("#button-logout");

    const logoutStartTime = new Date().getTime();

    await Promise.resolve(logoutButton.click());
    page.locator("#button-login").waitFor({ state: "visible" });

    const logoutEndTime = new Date().getTime();

    const logoutCheck = check(page, {
      logout_success: (p) => p.locator("h2").textContent() === "ログイン",
    });
    if (logoutCheck) {
      logoutSuccessCounter[areaId - 2].add(1);
      logoutTime[areaId - 2].add(logoutEndTime - logoutStartTime);
    } else {
      logoutFailCounter[areaId - 2].add(1);
      fail();
    }
  } finally {
    page.close();
  }
}
