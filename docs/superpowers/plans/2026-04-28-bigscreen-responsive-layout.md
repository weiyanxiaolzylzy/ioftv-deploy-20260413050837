# Bigscreen Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed 1920x1080 scale shell with a full-screen responsive bigscreen layout optimized for 21:9, including a black translucent background overlay.

**Architecture:** The bigscreen home shell will stop using `ScaleScreen` and become a viewport-sized container driven by CSS Grid and responsive sizing primitives. The dashboard body in `src/views/indexs/index.vue` will keep the current information architecture but shift to a `22 / 54 / 24` responsive column ratio, while the header and top controls move from fixed-pixel positioning to viewport-aware spacing.

**Tech Stack:** Vue 2, Vue Router, SCSS, Vue CLI/Webpack, @jiaminghi/data-view

---

## File Structure

- Modify: `src/views/home.vue`
  Responsibility: remove the fixed `ScaleScreen` wrapper usage and keep the bigscreen shell mounted directly in the viewport.
- Modify: `src/views/home.scss`
  Responsibility: rebuild the full-screen shell, header sizing, spacing, and background overlay for responsive behavior.
- Modify: `src/views/indexs/index.vue`
  Responsibility: make the inspection and sales dashboard layouts responsive, replace fixed control positioning, and enforce the approved `22 / 54 / 24` ultra-wide ratio.
- Reference: `package.json`
  Responsibility: use `npm run serve` and `npm run build` as the regression harness because this repo does not include a frontend unit test runner.

## Implementation Notes

- There is no existing automated frontend test framework in this repo. Use `npm run build` as the compile-time regression check and browser viewport checks as the layout regression harness.
- Keep business widgets intact unless a local height/overflow rule is required to fit the new shell.
- Do not modify IFC pages, routes, or API behavior as part of this change.

### Task 1: Remove the Fixed Scale Wrapper from the Bigscreen Entry

**Files:**
- Modify: `src/views/home.vue:8-115`
- Test: `package.json:5-11`

- [ ] **Step 1: Capture the failing baseline in the browser**

Run:

```bash
npm run serve
```

Expected baseline:

- the page renders inside a scaled `1920x1080` shell
- at a `2560x1080` or `3440x1440` devtools viewport, the dashboard appears centered/scaled instead of truly reflowing
- the header looks tall relative to the screen height

- [ ] **Step 2: Replace the `ScaleScreen` template in `src/views/home.vue`**

Write this template:

```vue
<template>
  <div class="screen-shell">
    <div class="bg" :class="{ 'light-theme': isLightTheme }">
      <dv-loading v-if="loading">Loading...</dv-loading>
      <div v-else class="host-body">
        <div class="d-flex jc-center title_wrap">
          <div class="zuojuxing"></div>
          <div class="youjuxing"></div>
          <div class="zuojuxing2"></div>
          <div class="guang"></div>
          <div class="d-flex jc-center title_main">
            <div class="title">
              <img src="@/assets/img/logo/logo.png" class="header-logo" alt="Logo">
              <span class="title-text">钢结构数字孪生智能检测系统</span>
            </div>
          </div>
          <div class="timers">
            {{ dateYear }} {{ dateWeek }} {{ dateDay }}
          </div>
        </div>

        <div class="dashboard-shell">
          <router-view></router-view>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Remove `ScaleScreen` from the script block**

Replace the script with:

```js
<script>
import { formatTime } from "../utils/index.js";

export default {
  data() {
    return {
      timing: null,
      loading: true,
      dateDay: null,
      dateYear: null,
      dateWeek: null,
      weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      isLightTheme: false,
    };
  },
  filters: {
    numsFilter(msg) {
      return msg || 0;
    },
  },
  created() {
    const savedTheme = localStorage.getItem("themeMode");
    if (savedTheme === "light") {
      this.isLightTheme = true;
    }
  },
  mounted() {
    this.timeFn();
    this.cancelLoading();
    window.addEventListener("themeChange", this.handleThemeChange);
  },
  beforeDestroy() {
    clearInterval(this.timing);
    window.removeEventListener("themeChange", this.handleThemeChange);
  },
  methods: {
    handleThemeChange() {
      const savedTheme = localStorage.getItem("themeMode");
      this.isLightTheme = savedTheme === "light";
    },
    timeFn() {
      this.timing = setInterval(() => {
        this.dateDay = formatTime(new Date(), "HH: mm: ss");
        this.dateYear = formatTime(new Date(), "yyyy-MM-dd");
        this.dateWeek = this.weekday[new Date().getDay()];
      }, 1000);
    },
    cancelLoading() {
      let timer = setTimeout(() => {
        this.loading = false;
        clearTimeout(timer);
      }, 500);
    },
  },
};
</script>
```

- [ ] **Step 4: Run the build to confirm the shell compiles**

Run:

```bash
npm run build
```

Expected:

- build completes successfully
- no `ScaleScreen` import/component reference errors remain

- [ ] **Step 5: Commit**

```bash
git add src/views/home.vue
git commit -m "refactor: remove fixed ScaleScreen wrapper from bigscreen home"
```

### Task 2: Build the Responsive Shell, Header, and Background Overlay

**Files:**
- Modify: `src/views/home.scss:1-158`
- Test: `package.json:5-11`

- [ ] **Step 1: Replace the old `.scale-wrap` shell styles with viewport-based shell styles**

Replace the top shell block in `src/views/home.scss` with:

```scss
.screen-shell {
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  background: #020a12;
  color: #d3d6dd;
}

.screen-shell * {
  box-sizing: border-box;
}

.screen-shell .bg {
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: clamp(12px, 0.95vw, 22px) clamp(12px, 0.95vw, 22px) clamp(10px, 0.7vw, 18px);
  background-image: url("/背景.png");
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  overflow: hidden;
}

.screen-shell .bg::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.34);
  pointer-events: none;
}

.screen-shell .bg.light-theme {
  background: #f5f7fa;
}

.screen-shell .bg.light-theme::before {
  background: rgba(255, 255, 255, 0);
}

.screen-shell .host-body {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - clamp(24px, 1.9vw, 44px));
  display: grid;
  grid-template-rows: clamp(68px, 8vh, 96px) minmax(0, 1fr);
  gap: clamp(8px, 0.75vw, 16px);
}

.screen-shell .dashboard-shell {
  min-height: 0;
  overflow: hidden;
}
```

- [ ] **Step 2: Make the header flatter and responsive**

Add or replace the header/title block with:

```scss
.screen-shell .host-body .title_wrap {
  height: 100%;
  min-height: 0;
  padding: 0 clamp(12px, 1vw, 24px);
  background-image: url("../assets/img/top.png");
  background-size: 100% 100%;
  background-position: center center;
  position: relative;
  margin-bottom: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.screen-shell .host-body .title_main {
  min-width: 0;
  justify-content: center;
}

.screen-shell .host-body .title {
  position: relative;
  min-height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 0.8vw, 18px);
  text-align: center;
  color: transparent;
}

.screen-shell .host-body .title .header-logo {
  width: clamp(34px, 2vw, 46px);
  height: clamp(34px, 2vw, 46px);
  object-fit: contain;
  margin-right: 0;
  margin-bottom: 0;
}

.screen-shell .host-body .title .title-text {
  font-size: clamp(24px, 1.65vw, 34px);
  font-weight: 900;
  letter-spacing: clamp(1px, 0.12vw, 3px);
  white-space: nowrap;
  background: linear-gradient(92deg, #0072ff 0%, #00eaff 48.85%, #01aaff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.screen-shell .host-body .title_wrap .timers {
  position: absolute;
  right: clamp(8px, 0.9vw, 18px);
  top: 50%;
  transform: translateY(-50%);
  font-size: clamp(14px, 0.95vw, 20px);
  display: flex;
  align-items: center;
}
```

- [ ] **Step 3: Keep the decorative assets but scale them for ultra-wide layouts**

Update the decorative selectors to use bounded values:

```scss
.screen-shell .host-body .title_wrap .guang {
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(-20px, -1.4vw, -10px);
  background-image: url("../assets/img/guang.png");
  background-position: center center;
  background-size: cover;
  height: clamp(32px, 3vw, 56px);
}

.screen-shell .host-body .title_wrap .zuojuxing,
.screen-shell .host-body .title_wrap .youjuxing,
.screen-shell .host-body .title_wrap .zuojuxing2 {
  position: absolute;
  top: -2px;
  height: 6px;
  background-image: url("../assets/img/headers/juxing1.png");
  background-size: cover;
}

.screen-shell .host-body .title_wrap .zuojuxing {
  left: 11%;
  width: clamp(120px, 12vw, 260px);
}

.screen-shell .host-body .title_wrap .youjuxing {
  right: 5%;
  width: clamp(120px, 10vw, 220px);
  transform: rotate(180deg);
}

.screen-shell .host-body .title_wrap .zuojuxing2 {
  left: 5%;
  width: clamp(96px, 7vw, 160px);
}
```

- [ ] **Step 4: Run the build and verify the overlay is behind content**

Run:

```bash
npm run build
```

Expected:

- build completes successfully
- header and router content remain visible above the `.bg::before` overlay

- [ ] **Step 5: Commit**

```bash
git add src/views/home.scss
git commit -m "style: add responsive bigscreen shell and background overlay"
```

### Task 3: Refactor the Inspection Dashboard Layout and Control Placement

**Files:**
- Modify: `src/views/indexs/index.vue:8-52`
- Modify: `src/views/indexs/index.vue:737-854`
- Test: `package.json:5-11`

- [ ] **Step 1: Group the top controls into a responsive control rail**

Update the top of the template to:

```vue
<template>
  <div class="contents" :class="themeClass">
    <div class="dashboard-controls">
      <button type="button" class="theme-toggle-btn" @click="toggleTheme" :title="themeHint">
        <span v-if="themeMode === 'light'">亮</span>
        <span v-else-if="themeMode === 'steel-qc'">钢</span>
        <span v-else>深</span>
      </button>

      <button type="button" class="mode-toggle-btn" @click="toggleMode">
        {{ viewMode === 'inspection' ? '销售模式' : '检测模式' }}
      </button>

      <button type="button" class="version-toggle-btn" @click="toggleVersion">
        钢结构尺寸检测系统
      </button>
    </div>

    <template v-if="viewMode === 'inspection'">
      <div class="contetn_left">
        <div class="pagetab"></div>
        <ItemWrap class="contetn_left-top contetn_lr-item" title="检测总览">
          <LeftTop />
        </ItemWrap>
        <ItemWrap class="contetn_left-center contetn_lr-item" title="实时监测状态" style="padding: 0 8px 10px 8px">
          <LeftCenter />
        </ItemWrap>
        <ItemWrap class="contetn_left-bottom contetn_lr-item" title="检测计划" style="padding: 0 8px 10px 8px">
          <LeftBottom />
        </ItemWrap>
      </div>

      <div class="contetn_center_top">
        <CenterMap />
      </div>

      <div class="contetn_right">
        <ItemWrap class="contetn_right-top contetn_lr-item" title="生产绩效榜">
          <MonthlyPerformance />
        </ItemWrap>
      </div>

      <div class="contetn_center_bottom">
        <div class="realtime_bottom_box">
          <RightBottom ref="rightBottom" />
        </div>
      </div>
    </template>
```

- [ ] **Step 2: Replace the fixed-position button rules with responsive control rail styles**

Replace the top button CSS with:

```scss
.dashboard-controls {
  position: absolute;
  top: clamp(8px, 0.9vw, 20px);
  left: clamp(8px, 0.9vw, 20px);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: clamp(10px, 0.8vw, 18px);
}

.theme-toggle-btn,
.mode-toggle-btn,
.version-toggle-btn {
  position: static;
  margin: 0;
}

.theme-toggle-btn {
  width: clamp(40px, 2.2vw, 48px);
  height: clamp(40px, 2.2vw, 48px);
  font-size: clamp(20px, 1.2vw, 24px);
}

.mode-toggle-btn,
.version-toggle-btn {
  height: clamp(40px, 2.3vw, 48px);
  padding: 0 clamp(14px, 1vw, 22px);
  font-size: clamp(13px, 0.78vw, 16px);
}
```

- [ ] **Step 3: Replace the fixed inspection grid with the approved `22 / 54 / 24` responsive layout**

Replace the `.contents` inspection layout block with:

```scss
.contents {
  position: relative;
  display: grid;
  grid-template-columns: minmax(260px, 22fr) minmax(0, 54fr) minmax(280px, 24fr);
  grid-template-rows: minmax(0, 1fr) minmax(clamp(220px, 27vh, 340px), 0.82fr);
  gap: clamp(10px, 0.75vw, 18px);
  align-items: stretch;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding-top: clamp(58px, 4.8vw, 82px);

  .contetn_left,
  .contetn_right {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: clamp(10px, 0.75vw, 18px);
    min-height: 0;
  }

  .contetn_left {
    grid-column: 1;
    grid-row: 1 / span 2;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);
    gap: clamp(10px, 0.75vw, 18px);
    position: relative;
  }

  .contetn_center_top {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    min-height: 0;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .contetn_right {
    grid-column: 3;
    grid-row: 1;
  }

  .contetn_center_bottom {
    grid-column: 2 / span 2;
    grid-row: 2;
    min-width: 0;
    min-height: 0;
  }

  .contetn_right-top,
  .contetn_left-top,
  .contetn_left-center,
  .contetn_left-bottom {
    min-height: 0;
    height: auto;
  }

  .realtime_bottom_box {
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 190, 255, 0.35);
    border-radius: 12px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
}
```

- [ ] **Step 4: Add aspect-ratio guards so 16:9 remains acceptable**

Append these media queries after the `.contents` block:

```scss
@media (min-aspect-ratio: 21/9) {
  .contents {
    grid-template-columns: minmax(260px, 22fr) minmax(0, 54fr) minmax(280px, 24fr);
    padding-top: clamp(56px, 4.4vw, 78px);
  }
}

@media (max-aspect-ratio: 16/9) {
  .contents {
    grid-template-columns: minmax(300px, 24fr) minmax(0, 52fr) minmax(280px, 24fr);
    grid-template-rows: minmax(0, 1fr) minmax(clamp(220px, 29vh, 360px), 0.9fr);
    padding-top: clamp(64px, 5.6vw, 90px);
  }
}
```

- [ ] **Step 5: Run the build and verify inspection mode still mounts**

Run:

```bash
npm run build
```

Expected:

- build succeeds
- no template parse errors from the control rail changes

- [ ] **Step 6: Commit**

```bash
git add src/views/indexs/index.vue
git commit -m "style: make inspection dashboard responsive for ultra-wide screens"
```

### Task 4: Make Sales Mode Responsive and Keep Cards Bounded

**Files:**
- Modify: `src/views/indexs/index.vue:827-854`
- Test: `package.json:5-11`

- [ ] **Step 1: Replace fixed sales side widths with responsive side rails**

Update the sales layout block to:

```scss
.sales_layout {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  gap: clamp(12px, 0.85vw, 20px);
  padding: 0;
  box-sizing: border-box;

  .sales_left,
  .sales_center,
  .sales_right {
    display: flex;
    flex-direction: column;
    gap: clamp(10px, 0.75vw, 18px);
    min-height: 0;
  }

  .sales_left,
  .sales_right {
    flex: 0 0 clamp(320px, 22vw, 520px);
  }

  .sales_center {
    flex: 1 1 auto;
    min-width: 0;
  }

  .sales_block {
    min-height: 0;
    height: clamp(280px, 32vh, 360px);
  }
}
```

- [ ] **Step 2: Add ultra-wide and baseline guards for sales mode**

Append:

```scss
@media (min-aspect-ratio: 21/9) {
  .sales_layout .sales_left,
  .sales_layout .sales_right {
    flex-basis: clamp(340px, 21vw, 560px);
  }
}

@media (max-aspect-ratio: 16/9) {
  .sales_layout {
    gap: 12px;
  }

  .sales_layout .sales_left,
  .sales_layout .sales_right {
    flex-basis: clamp(280px, 24vw, 420px);
  }
}
```

- [ ] **Step 3: Run the app and manually verify mode switching**

Run:

```bash
npm run serve
```

Manual checks:

- log in and land on `/home/index`
- click the mode toggle to switch between inspection and sales
- confirm sales mode fills the page width without fixed `540px` side rails
- confirm no card column collapses or overflows at `2560x1080`

- [ ] **Step 4: Run the build to keep compile-time regressions covered**

Run:

```bash
npm run build
```

Expected:

- build completes successfully

- [ ] **Step 5: Commit**

```bash
git add src/views/indexs/index.vue
git commit -m "style: make sales dashboard responsive on wide screens"
```

### Task 5: Integrated Verification and Final Cleanup

**Files:**
- Modify only for confirmed overflow regressions: `src/views/home.scss`
- Modify only for confirmed overflow regressions: `src/views/indexs/index.vue`
- Test: `package.json:5-11`

- [ ] **Step 1: Run the integrated browser verification pass**

Run:

```bash
npm run serve
```

Check these viewports in browser devtools:

- `2560x1080`
- `3440x1440`
- `1920x1080`

Validate:

- the dashboard fills the viewport directly with no scale margins
- the left rail is narrower than before but not cramped
- the center region feels wider
- the header is flatter on ultra-wide screens
- the black translucent overlay improves contrast
- the theme toggle, mode toggle, and version button stay reachable and aligned
- the login page still renders normally at `/#/login`
- the project IFC page still keeps its own layout at `/#/project-ifc`

- [ ] **Step 2: Fix any overflow-only regressions locally instead of reintroducing scaling**

If a panel overflows, apply only bounded layout fixes such as:

```scss
.contents .contetn_left,
.contents .contetn_center_top,
.contents .contetn_right,
.contents .contetn_center_bottom,
.sales_layout .sales_left,
.sales_layout .sales_center,
.sales_layout .sales_right {
  min-height: 0;
  min-width: 0;
}
```

Use this pattern only where the browser pass shows an actual overflow issue.

- [ ] **Step 3: Run the final production build**

Run:

```bash
npm run build
```

Expected:

- build completes successfully
- emitted assets contain the updated bigscreen shell and dashboard styles

- [ ] **Step 4: Commit**

```bash
git add src/views/home.scss src/views/indexs/index.vue
git commit -m "feat: deliver responsive bigscreen layout for 21:9 displays"
```
