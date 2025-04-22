<script setup lang="ts">
import { computed, PropType } from "vue";

import AIcon from "~icons/emojione-monotone/letter-a";
import BIcon from "~icons/emojione-monotone/letter-b";
import CIcon from "~icons/emojione-monotone/letter-c";
import DIcon from "~icons/emojione-monotone/letter-d";
import EIcon from "~icons/emojione-monotone/letter-e";
import FIcon from "~icons/emojione-monotone/letter-f";
import GIcon from "~icons/emojione-monotone/letter-g";
import HIcon from "~icons/emojione-monotone/letter-h";
import IIcon from "~icons/emojione-monotone/letter-i";
import JIcon from "~icons/emojione-monotone/letter-j";
import KIcon from "~icons/emojione-monotone/letter-k";
import LIcon from "~icons/emojione-monotone/letter-l";
import MIcon from "~icons/emojione-monotone/letter-m";
import NIcon from "~icons/emojione-monotone/letter-n";
import OIcon from "~icons/emojione-monotone/letter-o";
import PIcon from "~icons/emojione-monotone/letter-p";
import QIcon from "~icons/emojione-monotone/letter-q";
import RIcon from "~icons/emojione-monotone/letter-r";
import SIcon from "~icons/emojione-monotone/letter-s";
import TIcon from "~icons/emojione-monotone/letter-t";
import UIcon from "~icons/emojione-monotone/letter-u";
import VIcon from "~icons/emojione-monotone/letter-v";
import WIcon from "~icons/emojione-monotone/letter-w";
import XIcon from "~icons/emojione-monotone/letter-x";
import YIcon from "~icons/emojione-monotone/letter-y";
import ZIcon from "~icons/emojione-monotone/letter-z";
import OneIcon from "~icons/emojione-monotone/digit-one";
import TwoIcon from "~icons/emojione-monotone/digit-two";
import ThreeIcon from "~icons/emojione-monotone/digit-three";
import FourIcon from "~icons/emojione-monotone/digit-four";
import FiveIcon from "~icons/emojione-monotone/digit-five";
import SixIcon from "~icons/emojione-monotone/digit-six";
import SevenIcon from "~icons/emojione-monotone/digit-seven";
import EightIcon from "~icons/emojione-monotone/digit-eight";
import NineIcon from "~icons/emojione-monotone/digit-nine";
import ZeroIcon from "~icons/emojione-monotone/digit-zero";

// 映射表
const letterIcons: Record<string, any> = {
  A: AIcon,
  B: BIcon,
  C: CIcon,
  D: DIcon,
  E: EIcon,
  F: FIcon,
  G: GIcon,
  H: HIcon,
  I: IIcon,
  J: JIcon,
  K: KIcon,
  L: LIcon,
  M: MIcon,
  N: NIcon,
  O: OIcon,
  P: PIcon,
  Q: QIcon,
  R: RIcon,
  S: SIcon,
  T: TIcon,
  U: UIcon,
  V: VIcon,
  W: WIcon,
  X: XIcon,
  Y: YIcon,
  Z: ZIcon,
  1: OneIcon,
  2: TwoIcon,
  3: ThreeIcon,
  4: FourIcon,
  5: FiveIcon,
  6: SixIcon,
  7: SevenIcon,
  8: EightIcon,
  9: NineIcon,
  0: ZeroIcon
};

// 主题配色数组
const themes = [
  {
    name: "豆沙绿",
    cardBg: "rgba(168, 192, 160, 0.2)",
    iconColor: "#4F6B45",
    iconBg: "rgba(186, 201, 181, 1)"
  },
  {
    name: "杏仁黄",
    cardBg: "rgba(244, 225, 161, 0.2)",
    iconColor: "#A57C1F",
    iconBg: "rgba(230, 220, 180, 1)"
  },
  {
    name: "藕荷粉",
    cardBg: "rgba(232, 192, 196, 0.2)",
    iconColor: "#A85B66",
    iconBg: "rgba(224, 203, 205, 1)"
  },
  {
    name: "薰衣草紫",
    cardBg: "rgba(215, 198, 229, 0.2)",
    iconColor: "#6A478E",
    iconBg: "rgba(210, 200, 220, 1)"
  },
  {
    name: "蔚蓝",
    cardBg: "rgba(192, 216, 232, 0.2)",
    iconColor: "#265D7A",
    iconBg: "rgba(200, 220, 230, 1)"
  },
  {
    name: "珊瑚橘",
    cardBg: "rgba(255, 209, 178, 0.2)",
    iconColor: "#C65C2B",
    iconBg: "rgba(245, 220, 200, 1)"
  },
  {
    name: "冰湖蓝",
    cardBg: "rgba(178, 229, 229, 0.2)",
    iconColor: "#2B7F7F",
    iconBg: "rgba(200, 224, 224, 1)"
  },
  {
    name: "蜜桃粉",
    cardBg: "rgba(255, 217, 225, 0.2)",
    iconColor: "#A63950",
    iconBg: "rgba(240, 215, 225, 1)"
  },
  {
    name: "雾霭灰",
    cardBg: "rgba(218, 218, 218, 0.2)",
    iconColor: "#646464",
    iconBg: "rgba(210, 210, 210, 1)"
  }
];

interface CardProductType {
  id: number;
  apartment?: string;
  area?: string;
  videoDriveLink?: string;
}

// 接收 video 和 index
const props = defineProps({
  video: { type: Object as PropType<CardProductType>, required: true },
  index: { type: Number, required: true }
});

// 根据 index 取主题
const theme = computed(() => themes[props.index % themes.length]);

// 取首字母并转大写
const firstLetter = computed(() => {
  const n = props.video.apartment?.trim() || "";
  return n.charAt(0).toUpperCase();
});

// 对应的 Icon 组件，找不到就用 Y
const LetterIcon = computed(
  () => letterIcons[firstLetter.value] || letterIcons["Y"]
);

defineOptions({ name: "ReCard" });

// 样式类
const cardClass = computed(() => ["list-card-item"]);
const cardLogoClass = computed(() => ["list-card-item_detail--logo"]);

function go() {
  window.open(props.video.videoDriveLink, "_blank");
}
</script>

<template>
  <div :class="cardClass" :style="{ backgroundColor: theme.cardBg }">
    <div class="list-card-item_detail">
      <el-row justify="space-between">
        <div
          :class="cardLogoClass"
          :style="{ color: theme.iconColor, backgroundColor: theme.iconBg }"
        >
          <component :is="LetterIcon" />
        </div>
        <div class="list-card-item_detail--operation">
          <el-tag
            color="#00a870"
            effect="dark"
            class="mx-1 list-card-item_detail--operation--tag"
          >
            在库
          </el-tag>
        </div>
      </el-row>
      <p class="list-card-item_detail--name text-text_color_primary">
        {{ video.apartment }}
      </p>
      <p class="list-card-item_detail--desc text-text_color_regular">
        {{ video.area }}
      </p>
      <el-button type="success" plain @click.stop="go">查看链接</el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.list-card-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  overflow: hidden;
  border-radius: 3px;

  &_detail {
    flex: 1;
    min-height: 140px;
    padding: 18px 32px;

    &--logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 46px;
      height: 46px;
      font-size: 26px;
      border-radius: 50%;

      /* color 和 background-color 由 inline style 注入 */

      &__disabled {
        color: #a1c4ff;
      }
    }

    &--operation {
      display: flex;
      height: 100%;

      &--tag {
        border: 0;
      }
    }

    &--name {
      margin: 20px 0 6px;
      font-size: 20px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      letter-spacing: 0.5px;
    }

    &--desc {
      display: -webkit-box;
      height: 40px;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      font-size: 16px;
      line-height: 1.4;
      -webkit-box-orient: vertical;
      color: var(--el-text-color-regular);
    }
  }

  &__disabled {
    .list-card-item_detail--name,
    .list-card-item_detail--desc {
      color: var(--el-text-color-disabled);
    }

    .list-card-item_detail--operation--tag {
      color: #bababa;
    }
  }
}
</style>
