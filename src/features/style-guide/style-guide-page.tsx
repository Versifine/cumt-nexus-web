"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  FileText,
  Info,
  LayoutGrid,
  ListFilter,
  MessageCircle,
  MoreHorizontal,
  MousePointer2,
  PenLine,
  Plus,
  Save,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { InlineFeedback } from "@/components/feedback/inline-feedback";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  IndexedInfoRow,
  InfoRow,
  MetaCell,
  MetricBlock,
  StatusToken,
} from "@/components/ui/data-display";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverPreview } from "@/components/ui/hover-preview";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SortMenu, type SortMenuItem } from "@/components/ui/sort-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type {
  ComponentInventoryGroup,
  ComponentInventorySummary,
} from "./types";

type ComponentCatalogItem = {
  id: string;
  index: string;
  name: string;
  note: string;
  purpose: string;
};

type StyleSortValue = "latest" | "stable" | "risk";

const componentCatalog: ComponentCatalogItem[] = [
  {
    id: "button",
    index: "01",
    name: "Button",
    purpose: "提交、确认、创建等明确命令。",
    note: "普通跳转不用 Button asChild，优先用文字动作。",
  },
  {
    id: "text-action",
    index: "02",
    name: "TextAction",
    purpose: "导航、返回、右栏入口和行内跳转。",
    note: "保持短文案、清晰 hover 与 focus 状态。",
  },
  {
    id: "form-controls",
    index: "03",
    name: "Input / Textarea",
    purpose: "表单输入、搜索输入和长文本输入。",
    note: "错误、禁用、placeholder 都必须有可读状态。",
  },
  {
    id: "badge-token",
    index: "04",
    name: "Badge / StatusToken",
    purpose: "状态、角色、数量和轻量分类。",
    note: "颜色复用固定 tone，不按页面临时造色。",
  },
  {
    id: "alert-feedback",
    index: "05",
    name: "Alert / InlineFeedback",
    purpose: "表单级错误、成功提示和上下文提示。",
    note: "字段错误贴近字段，页面错误用反馈组件。",
  },
  {
    id: "card",
    index: "06",
    name: "Card",
    purpose: "明确成组的信息容器。",
    note: "不是页面 section 默认外壳，避免卡片套卡片。",
  },
  {
    id: "data-display",
    index: "07",
    name: "DataDisplay",
    purpose: "指标、键值、编号说明和元信息。",
    note: "MetricBlock、InfoRow 等不要在页面局部复制。",
  },
  {
    id: "tabs",
    index: "08",
    name: "Tabs",
    purpose: "同一资源下的视图切换。",
    note: "不承载主导航，数量控制在 2 到 5 个。",
  },
  {
    id: "dropdown",
    index: "09",
    name: "DropdownMenu",
    purpose: "用户菜单、更多操作、轻量筛选。",
    note: "主要动作不藏进菜单，危险操作单独分隔。",
  },
  {
    id: "sort-menu",
    index: "10",
    name: "SortMenu",
    purpose: "列表排序入口。",
    note: "排序文案短，描述解释排序依据。",
  },
  {
    id: "dialog",
    index: "11",
    name: "Dialog",
    purpose: "危险确认、短表单和关键确认。",
    note: "标题具体，描述说清后果，移动端不能溢出。",
  },
  {
    id: "hover-preview",
    index: "12",
    name: "HoverPreview",
    purpose: "用户、社区或术语的轻量预览。",
    note: "只补充上下文，不放复杂表单。",
  },
  {
    id: "loading",
    index: "13",
    name: "Skeleton / LoadingState",
    purpose: "页面和列表加载骨架。",
    note: "形状尽量接近最终内容，不用整页 spinner。",
  },
  {
    id: "empty-error",
    index: "14",
    name: "EmptyState / ErrorState",
    purpose: "空结果、错误和可恢复状态。",
    note: "给出下一步，不写长教程。",
  },
  {
    id: "toast",
    index: "15",
    name: "Toaster / Sonner",
    purpose: "轻量成功或失败反馈。",
    note: "不承载关键结果，不替代表单错误。",
  },
];

const sortItems: Array<SortMenuItem<StyleSortValue>> = [
  {
    value: "latest",
    label: "最近调整",
    description: "按最近被审视或修改的组件优先。",
  },
  {
    value: "stable",
    label: "稳定基础",
    description: "优先查看全站复用频率最高的组件。",
  },
  {
    value: "risk",
    label: "风险优先",
    description: "优先检查容易被页面局部复制的组件。",
  },
];

export function StyleGuidePage({
  inventory,
}: {
  inventory: {
    groups: ComponentInventoryGroup[];
    summary: ComponentInventorySummary;
  };
}) {
  const [sortValue, setSortValue] = useState<StyleSortValue>("stable");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const normalizedInventoryQuery = inventoryQuery.trim().toLowerCase();
  const filteredInventoryGroups = useMemo(() => {
    if (!normalizedInventoryQuery) {
      return inventory.groups;
    }

    return inventory.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = [
            group.label,
            group.description,
            item.file,
            ...item.components,
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedInventoryQuery);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [inventory.groups, normalizedInventoryQuery]);
  const filteredFileCount = filteredInventoryGroups.reduce(
    (count, group) => count + group.items.length,
    0,
  );

function showToast(kind: "success" | "error") {
    if (kind === "success") {
      toast.success("样式台账已记录", {
        description: "这个反馈只用于轻量确认，不替代表单结果。",
      });
      return;
    }

    toast.error("演示错误反馈", {
      description: "真实错误需要在页面或字段附近给出可恢复动作。",
    });
  }

  return (
    <div className="space-y-10">
      <header className="border-b border-border pb-8">
        <div className="font-mono text-xs text-primary">组件台账 / 全量索引</div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-8 tracking-normal sm:text-3xl">
              全量组件统一展示页
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              这个页面把当前 `src` 下的 TSX 组件文件、主要组件名、基础组件示例和视觉备注集中到一处。后续统一网站风格时，先按全量索引定位，再回到基础组件或业务组件源头修复。
            </p>
          </div>
          <div className="grid rounded-md bg-surface-raised sm:grid-cols-3 lg:grid-cols-1">
            <MetricBlock
              label="TSX 文件"
              value={inventory.summary.fileCount}
              variant="compact"
            />
            <MetricBlock
              label="组件名"
              value={inventory.summary.componentCount}
              variant="compact"
            />
            <MetricBlock
              label="目录分组"
              value={inventory.summary.groupCount}
              variant="compact"
            />
          </div>
        </div>
      </header>

      <InkPreviewSection />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="font-mono text-xs text-primary">全量索引</div>
              <h2 className="mt-2 text-lg font-semibold">所有 TSX 组件文件</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                这里按文件列出全部组件修复入口；同一文件内的本地子组件会在右侧以短标签展示。
              </p>
            </div>
            <div className="w-full md:w-80">
              <label className="sr-only" htmlFor="component-inventory-search">
                搜索组件台账
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="component-inventory-search"
                  className="pl-9"
                  value={inventoryQuery}
                  onChange={(event) => setInventoryQuery(event.target.value)}
                  placeholder="搜索组件、路径或分组"
                />
              </div>
            </div>
          </div>
          <ComponentInventory
            fileCount={filteredFileCount}
            groups={filteredInventoryGroups}
            hasQuery={Boolean(normalizedInventoryQuery)}
          />
        </div>

        <aside className="h-fit border-y border-border py-4 lg:sticky lg:top-24">
          <div className="px-1">
            <div className="font-mono text-[11px] uppercase text-primary">
              修复口径
            </div>
            <h2 className="mt-2 text-sm font-semibold">以文件为最小排查单元</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              全量索引覆盖路由、壳层、业务组件、Provider 和基础组件；视觉修复优先沉淀到基础 UI，再处理业务局部差异。
            </p>
          </div>
          <div className="mt-4 divide-y divide-border border-t border-border">
            <InfoRow label="当前文件" value={`${inventory.summary.fileCount} 个`} />
            <InfoRow label="主要组件名" value={`${inventory.summary.componentCount} 个`} />
            <InfoRow label="搜索结果" value={`${filteredFileCount} 个文件`} />
            <InfoRow label="生成方式" value="读取 src/**/*.tsx" wrap />
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center justify-between gap-4 border-b border-border pb-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">基础组件目录</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                这些基础件有真实展示示例，是后续统一视觉时最先要收敛的组件源头。
              </p>
            </div>
            <StatusToken tone="primary">当前基础集</StatusToken>
          </div>
          <div className="divide-y divide-border border-b border-border">
            {componentCatalog.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="grid gap-3 py-4 text-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[52px_minmax(140px,180px)_minmax(0,1fr)]"
              >
                <span className="font-mono text-xs text-primary">{item.index}</span>
                <span className="font-semibold text-foreground">{item.name}</span>
                <span className="grid gap-2 text-muted-foreground md:grid-cols-2">
                  <span>{item.purpose}</span>
                  <span>{item.note}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <aside className="h-fit border-y border-border py-4 lg:sticky lg:top-24">
          <div className="px-1">
            <div className="font-mono text-[11px] uppercase text-primary">
              使用约束
            </div>
            <h2 className="mt-2 text-sm font-semibold">先改组件源头</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              如果某个组件展示不满意，优先调整 `src/components/ui` 或反馈组件，不在页面里复制新风格。
            </p>
          </div>
          <div className="mt-4 divide-y divide-border border-t border-border">
            <InfoRow label="视觉方向" value="暗色编辑产品" wrap />
            <InfoRow label="组件来源" value="shadcn/ui + Radix" wrap />
            <InfoRow label="图标来源" value="lucide-react" wrap />
            <InfoRow label="新增依赖" value="无" />
          </div>
        </aside>
      </section>

      <ComponentSection
        id="button"
        index="01"
        title="Button"
        file="src/components/ui/button.tsx"
        purpose="真正的主命令和表单提交。"
        note="同一区域只保留一个最高权重主按钮，禁用状态必须仍然可读。"
      >
        <ExamplePanel title="变体和禁用态">
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <Plus className="size-4" aria-hidden="true" />
              创建讨论
            </Button>
            <Button type="button" variant="secondary">
              <Save className="size-4" aria-hidden="true" />
              保存草稿
            </Button>
            <Button type="button" variant="outline">
              审阅记录
            </Button>
            <Button type="button" variant="ghost">
              取消
            </Button>
            <Button type="button" variant="destructive">
              <Trash2 className="size-4" aria-hidden="true" />
              删除
            </Button>
            <Button type="button" disabled>
              等待同步
            </Button>
            <Button type="button" size="icon" aria-label="打开设置">
              <Settings className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="text-action"
        index="02"
        title="TextAction"
        file="src/components/ui/text-action.tsx"
        purpose="承担普通导航、次级跳转、返回入口。"
        note="它是本项目降低按钮噪音的关键组件，适合侧栏、右栏和列表行内动作。"
      >
        <ExamplePanel title="文字动作">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <TextAction href="/communities" tone="primary">
                浏览社区
              </TextAction>
              <TextAction href="/" direction="back">
                返回信息流
              </TextAction>
            </div>
            <div>
              <TextAction href="/posts/new" tone="primary" variant="bar">
                发布新讨论
              </TextAction>
              <TextAction href="/community-applications/new" variant="bar">
                申请创建社区
              </TextAction>
            </div>
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="form-controls"
        index="03"
        title="Input / Textarea"
        file="src/components/ui/input.tsx / src/components/ui/textarea.tsx"
        purpose="统一搜索、表单字段和长文本输入。"
        note="必填说明不要只放在 placeholder，错误态使用 aria-invalid。"
      >
        <ExamplePanel title="字段状态">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">社区名称</span>
              <Input placeholder="例如：校园生活" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">搜索关键词</span>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input className="pl-9" placeholder="搜索帖子、社区或用户" />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">校验失败</span>
              <Input
                aria-invalid="true"
                defaultValue="ab"
                aria-describedby="style-guide-input-error"
              />
              <span
                id="style-guide-input-error"
                className="text-xs text-destructive"
              >
                用户名至少需要 3 个字符。
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">讨论正文</span>
              <Textarea placeholder="写下你要发布的内容。" />
            </label>
            <Input disabled placeholder="当前配置暂不可编辑" />
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="badge-token"
        index="04"
        title="Badge / StatusToken"
        file="src/components/ui/badge.tsx / src/components/ui/data-display.tsx"
        purpose="展示短状态、角色、分类和状态 tone。"
        note="Badge 更偏圆角标签，StatusToken 更偏编辑式状态标记。"
      >
        <ExamplePanel title="标签系统">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>版主</Badge>
              <Badge variant="secondary">公开社区</Badge>
              <Badge variant="outline">/campus-life</Badge>
              <Badge variant="success">已通过</Badge>
              <Badge variant="warning">待审核</Badge>
              <Badge variant="destructive">已移除</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusToken>默认</StatusToken>
              <StatusToken tone="primary">当前</StatusToken>
              <StatusToken tone="success">成功</StatusToken>
              <StatusToken tone="warning">注意</StatusToken>
              <StatusToken tone="danger">危险</StatusToken>
            </div>
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="alert-feedback"
        index="05"
        title="Alert / InlineFeedback"
        file="src/components/ui/alert.tsx / src/components/feedback/inline-feedback.tsx"
        purpose="承载表单级、页面局部和轻量上下文反馈。"
        note="错误反馈需要说明当前影响和恢复动作，不能只写失败。"
      >
        <ExamplePanel title="反馈语义">
          <div className="grid gap-4">
            <Alert>
              <Info className="size-4" aria-hidden="true" />
              <AlertTitle>信息提示</AlertTitle>
              <AlertDescription>
                这个组件适合表单上方的整体说明或轻量提示。
              </AlertDescription>
            </Alert>
            <Alert variant="success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <AlertTitle>保存成功</AlertTitle>
              <AlertDescription>
                成功提示保持短，后续动作放到页面主体里。
              </AlertDescription>
            </Alert>
            <InlineFeedback
              tone="error"
              title="暂时无法提交"
              description="当前网络请求失败，请保留输入内容后重试。"
              action={<Button type="button" variant="secondary">重试提交</Button>}
            />
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="card"
        index="06"
        title="Card"
        file="src/components/ui/card.tsx"
        purpose="对一组内容建立明确边界。"
        note="Card 只用于必要分组，不把整页或大 section 全部包进去。"
      >
        <ExamplePanel title="内容容器">
          <Card>
            <CardHeader>
              <CardTitle>社区申请</CardTitle>
              <CardDescription>
                用于需要明确聚合的一组审核信息。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <InfoRow label="申请人" value="@versifine" />
                <InfoRow label="目标 slug" value="/robot-lab" />
                <InfoRow label="状态" value={<StatusToken tone="warning">待审核</StatusToken>} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="button" size="sm">通过</Button>
              <Button type="button" size="sm" variant="ghost">稍后处理</Button>
            </CardFooter>
          </Card>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="data-display"
        index="07"
        title="DataDisplay"
        file="src/components/ui/data-display.tsx"
        purpose="统一指标块、键值行、编号说明和元信息单元。"
        note="这个组件族决定台账、管理页和右侧上下文栏的信息节奏。"
      >
        <ExamplePanel title="指标和编号">
          <div className="space-y-4">
            <div className="grid rounded-md bg-surface-raised sm:grid-cols-3">
              <MetricBlock label="帖子" value="128" />
              <MetricBlock label="评论" value="2.4k" />
              <MetricBlock label="在线" value="36" />
            </div>
            <div className="rounded-md bg-surface-raised px-3">
              <InfoRow
                icon={<CircleDot className="size-4" aria-hidden="true" />}
                label="当前状态"
                value={<StatusToken tone="success">运行中</StatusToken>}
              />
              <InfoRow label="最后同步" value="2 分钟前" />
            </div>
            <IndexedInfoRow
              index="A1"
              title="组件只能从基础层统一派生"
              text="页面如果需要新的展示形态，先判断是否应该进入基础组件或业务组件，而不是复制一份局部样式。"
            />
            <div className="grid rounded-md bg-surface-raised sm:grid-cols-3">
              <MetaCell label="来源" value="components/ui" />
              <MetaCell label="语义" value="基础展示" />
              <MetaCell label="风险" value="页面局部复制" />
            </div>
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="tabs"
        index="08"
        title="Tabs"
        file="src/components/ui/tabs.tsx"
        purpose="同一资源内部的同层级视图切换。"
        note="Tabs 不做全站主导航，不嵌套 Tabs。"
      >
        <ExamplePanel title="视图切换">
          <Tabs defaultValue="usage">
            <TabsList aria-label="组件视图">
              <TabsTrigger value="usage">用途</TabsTrigger>
              <TabsTrigger value="state">状态</TabsTrigger>
              <TabsTrigger value="risk">风险</TabsTrigger>
            </TabsList>
            <TabsContent value="usage" className="border-y border-border py-4">
              <p className="text-sm leading-6 text-muted-foreground">
                用于帖子详情下的评论、收藏、历史等同一资源视图。
              </p>
            </TabsContent>
            <TabsContent value="state" className="border-y border-border py-4">
              <p className="text-sm leading-6 text-muted-foreground">
                当前 tab 只通过底线和文字色强调，不制造重按钮感。
              </p>
            </TabsContent>
            <TabsContent value="risk" className="border-y border-border py-4">
              <p className="text-sm leading-6 text-muted-foreground">
                tab 文案过长或承载主导航时，会破坏扫读效率。
              </p>
            </TabsContent>
          </Tabs>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="dropdown"
        index="09"
        title="DropdownMenu"
        file="src/components/ui/dropdown-menu.tsx"
        purpose="承载更多操作、账号菜单和轻量选项。"
        note="危险项需要分隔并使用 destructive 语义。"
      >
        <ExamplePanel title="更多操作">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="secondary">
                <MoreHorizontal className="size-4" aria-hidden="true" />
                更多操作
                <ChevronDown className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>帖子操作</DropdownMenuLabel>
              <DropdownMenuItem>
                <BookOpen className="size-4" aria-hidden="true" />
                打开详情
                <DropdownMenuShortcut>Enter</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem checked>
                已收藏
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 className="size-4" aria-hidden="true" />
                移除内容
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="sort-menu"
        index="10"
        title="SortMenu"
        file="src/components/ui/sort-menu.tsx"
        purpose="统一列表排序入口。"
        note="排序属于轻量筛选，位置靠近列表标题或工具条。"
      >
        <ExamplePanel title="排序入口">
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">组件调整记录</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                当前排序：{sortItems.find((item) => item.value === sortValue)?.label}
              </p>
            </div>
            <SortMenu
              items={sortItems}
              label="组件排序"
              onValueChange={setSortValue}
              value={sortValue}
            />
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="dialog"
        index="11"
        title="Dialog"
        file="src/components/ui/dialog.tsx"
        purpose="危险确认、短流程确认和需要打断用户的操作。"
        note="不要用 Dialog 承载长页面，也不要嵌套多个 Dialog。"
      >
        <ExamplePanel title="确认弹层">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <ShieldAlert className="size-4" aria-hidden="true" />
                打开确认
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认移除这条内容？</DialogTitle>
                <DialogDescription>
                  移除后内容会从公开列表隐藏，审核记录仍会保留给管理人员查看。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">取消</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button type="button" variant="destructive">确认移除</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="hover-preview"
        index="12"
        title="HoverPreview"
        file="src/components/ui/hover-preview.tsx"
        purpose="悬停或聚焦时补充轻量上下文。"
        note="预览面板只呈现上下文，不塞入长表单或主要流程。"
      >
        <ExamplePanel title="悬停预览">
          <HoverPreview
            trigger={
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 border-b border-transparent text-sm font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MousePointer2 className="size-4" aria-hidden="true" />
                查看组件命名规则
              </button>
            }
          >
            <div className="rounded-lg border border-border bg-card p-3 text-card-foreground shadow-[0_12px_40px_rgb(0_0_0/0.35)]">
              <div className="text-sm font-semibold">命名规则</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                基础组件使用功能名，业务组件使用业务语义，避免页面里出现难复用的临时命名。
              </p>
            </div>
          </HoverPreview>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="loading"
        index="13"
        title="Skeleton / LoadingState"
        file="src/components/ui/skeleton.tsx / src/components/feedback/loading-state.tsx"
        purpose="加载中状态和列表骨架。"
        note="保留页面骨架，避免整页空白或全屏转圈。"
      >
        <ExamplePanel title="加载骨架">
          <div className="grid gap-5">
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-24 w-full" />
            </div>
            <LoadingState rows={2} />
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="empty-error"
        index="14"
        title="EmptyState / ErrorState"
        file="src/components/feedback/empty-state.tsx / src/components/feedback/error-state.tsx"
        purpose="处理空内容、错误和可恢复路径。"
        note="空状态给下一步，错误状态给恢复动作。"
      >
        <ExamplePanel title="页面状态">
          <div className="grid gap-4">
            <EmptyState
              title="还没有组件备注"
              description="添加第一个组件备注后，这里会展示更新记录。"
              action={<Button type="button" variant="secondary">添加备注</Button>}
            />
            <ErrorState
              title="暂时无法加载台账"
              description="可以稍后重试，已经展示的基础组件不会受影响。"
              action={<Button type="button" variant="secondary">重新加载</Button>}
            />
            <Alert variant="success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <AlertTitle>Submitted 状态</AlertTitle>
              <AlertDescription>
                提交完成后进入下一步，或显示这个短成功状态。
              </AlertDescription>
            </Alert>
            <Button type="button" disabled>
              当前无可执行动作
            </Button>
          </div>
        </ExamplePanel>
      </ComponentSection>

      <ComponentSection
        id="toast"
        index="15"
        title="Toaster / Sonner"
        file="src/components/ui/sonner.tsx"
        purpose="轻量提醒，不承载关键流程。"
        note="toast 适合保存成功、复制完成等短反馈；字段错误仍然贴近字段展示。"
      >
        <ExamplePanel title="Toast 触发">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => showToast("success")}>
              <Bell className="size-4" aria-hidden="true" />
              成功提示
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => showToast("error")}
            >
              <AlertCircle className="size-4" aria-hidden="true" />
              错误提示
            </Button>
          </div>
        </ExamplePanel>
      </ComponentSection>

      <section className="grid gap-6 border-y border-border py-8 lg:grid-cols-[144px_minmax(0,1fr)]">
        <div className="font-mono text-xs text-primary">后续</div>
        <div className="grid gap-5 lg:grid-cols-3">
          <GuidelineCard
            icon={<LayoutGrid className="size-4" aria-hidden="true" />}
            title="统一页面骨架"
            text="后续页面先对齐 App Shell、列表、详情和表单模式，再看局部组件。"
          />
          <GuidelineCard
            icon={<ListFilter className="size-4" aria-hidden="true" />}
            title="补齐缺失封装"
            text="如果需要 Select、Switch、Table 等基础件，先封装到 ui 再回填本页。"
          />
          <GuidelineCard
            icon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
            title="减少局部变体"
            text="重复出现的页面级样式应沉淀成组件，避免每个页面各写一份。"
          />
        </div>
      </section>
    </div>
  );
}

function InkPreviewSection() {
  return (
    <section
      data-style-preview="surface-ledger"
      className="overflow-hidden rounded-lg bg-background text-foreground shadow-[0_22px_64px_rgb(0_0_0/0.24)]"
    >
      <div className="grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden bg-background-soft p-5 lg:block">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-surface-raised text-sm font-semibold text-primary">
              CN
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">CUMT Nexus</span>
              <span className="block text-xs text-subtle-foreground">校园社区</span>
            </span>
          </div>

          <nav className="mt-8 space-y-1.5 text-sm">
            {["首页", "全站", "关注", "社区"].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2.5",
                  index === 0
                    ? "bg-surface-raised text-foreground ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-surface-hover",
                )}
              >
                <span className="font-mono text-[11px] text-subtle-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{item}</span>
                {index === 0 ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                ) : null}
              </div>
            ))}
          </nav>

          <div className="mt-8 rounded-md bg-surface p-3">
            <div className="font-mono text-[11px] uppercase text-primary">
              Layer
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              用背景深浅、间距和字重建立层级；分割线只留给真正需要边界的系统区域。
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 bg-background-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase text-primary">
                Nexus Surface / 第四版样张
              </div>
              <h2 className="mt-1 text-lg font-semibold leading-6">
                贴近当前版本，用面层替代分割线
              </h2>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" aria-hidden="true" />
              发帖
            </button>
          </div>

          <div className="grid gap-4 bg-background p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_304px]">
            <main className="min-w-0 space-y-3">
              <section className="rounded-md bg-background-soft p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-primary">FEED</div>
                    <h3 className="mt-1 text-base font-semibold">全站最新讨论</h3>
                  </div>
                  <div className="flex rounded-md bg-surface-raised p-1 text-xs font-medium text-muted-foreground">
                    <button type="button" className="rounded px-2.5 py-1.5 text-foreground">
                      最新
                    </button>
                    <button type="button" className="rounded px-2.5 py-1.5 hover:bg-surface-hover">
                      热门
                    </button>
                    <button type="button" className="rounded px-2.5 py-1.5 hover:bg-surface-hover">
                      关注
                    </button>
                  </div>
                </div>
              </section>

              <article className="rounded-md bg-surface p-4 shadow-[0_10px_28px_rgb(0_0_0/0.16)] transition-colors hover:bg-surface-hover sm:p-5">
                <div className="grid gap-4 sm:grid-cols-[42px_minmax(0,1fr)]">
                  <div className="font-mono text-xs text-subtle-foreground">01</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">/campus-life</span>
                      <span>今天 18:42</span>
                      <span>公共讨论</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold leading-7">
                      图书馆晚上的自习区能不能开放到十一点？
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      最近期末周位置很紧，大家更关心的是安静区域、插座和闭馆时间，而不是再开一个复杂预约入口。
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                      <button
                        type="button"
                        className="rounded-md bg-surface-hover px-2.5 py-1.5 font-semibold text-foreground"
                      >
                        赞同 42
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-surface-raised px-2.5 py-1.5 text-muted-foreground hover:bg-surface-hover"
                      >
                        评论 18
                      </button>
                      <button type="button" className="px-1.5 py-1.5 text-muted-foreground hover:text-foreground">
                        收藏
                      </button>
                      <button
                        type="button"
                        className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                        aria-label="更多操作"
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>

              <section className="rounded-md bg-surface p-4 shadow-[0_10px_28px_rgb(0_0_0/0.14)] sm:p-5">
                <div className="grid gap-4 sm:grid-cols-[42px_minmax(0,1fr)]">
                  <div className="font-mono text-xs text-subtle-foreground">02</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-md bg-surface-hover text-xs font-semibold text-primary">
                        L
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">linyu</div>
                        <div className="text-xs text-subtle-foreground">2 分钟前</div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      我更希望先优化座位占用提示。现在的问题不是入口不够多，而是大家不知道哪些区域真的可用。
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-primary">
                      <button type="button">回复</button>
                      <button type="button">引用</button>
                      <button type="button" className="text-muted-foreground">
                        收起
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-md bg-surface p-4 shadow-[0_10px_28px_rgb(0_0_0/0.14)] sm:p-5">
                <label className="text-sm font-semibold" htmlFor="ink-preview-comment">
                  写下回复
                </label>
                <textarea
                  id="ink-preview-comment"
                  className="mt-3 min-h-24 w-full resize-none rounded-md bg-surface-raised px-3 py-2 text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:bg-surface-hover focus:ring-2 focus:ring-primary/45"
                  placeholder="用简短事实推进讨论。"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-subtle-foreground">支持 Markdown</span>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    发送回复
                  </button>
                </div>
              </section>
            </main>

            <aside className="space-y-3">
              <section className="rounded-md bg-background-soft p-4">
                <div className="font-mono text-[11px] uppercase text-primary">
                  COMMUNITY
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <PreviewMetric label="在线" value="36" />
                  <PreviewMetric label="今日帖子" value="12" />
                  <PreviewMetric label="待处理" value="2" className="col-span-2" />
                </div>
              </section>
              <section className="rounded-md bg-background-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold">版规摘要</h3>
                  <span className="rounded bg-primary-muted px-2 py-1 text-xs font-semibold text-primary">
                    正常
                  </span>
                </div>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {["先给结论，再补充上下文。", "避免重复刷屏和无来源传言。", "治理操作只在必要处显色。"].map(
                    (item, index) => (
                      <li key={item} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
                        <span className="font-mono text-xs text-subtle-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{item}</span>
                      </li>
                    ),
                  )}
                </ol>
              </section>
              <section className="rounded-md bg-surface-raised p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    className="mt-0.5 size-4 text-warning"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">治理提示</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      重要状态只在局部显色，避免把整页做成状态标签集合。
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewMetric({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={cn("rounded-md bg-surface-raised px-3 py-3", className)}>
      <div className="text-xs text-subtle-foreground">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function ComponentSection({
  children,
  file,
  id,
  index,
  note,
  purpose,
  title,
}: {
  children: ReactNode;
  file: string;
  id: string;
  index: string;
  note: string;
  purpose: string;
  title: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 grid gap-6 border-t border-border py-8 lg:grid-cols-[144px_minmax(0,1fr)]"
    >
      <div className="font-mono text-xs text-primary">{index}</div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <StatusToken className="break-all">{file}</StatusToken>
          </div>
          <div className="mt-4 divide-y divide-border border-y border-border">
            <InfoRow
              icon={<FileText className="size-4" aria-hidden="true" />}
              label="功能"
              value={purpose}
              wrap
            />
            <InfoRow
              icon={<PenLine className="size-4" aria-hidden="true" />}
              label="备注"
              value={note}
              wrap
            />
            <InfoRow
              icon={<MessageCircle className="size-4" aria-hidden="true" />}
              label="讨论编号"
              value={`#${index}`}
            />
          </div>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function ComponentInventory({
  fileCount,
  groups,
  hasQuery,
}: {
  fileCount: number;
  groups: ComponentInventoryGroup[];
  hasQuery: boolean;
}) {
  if (groups.length === 0) {
    return (
      <EmptyState
        className="border-b border-border"
        title="没有匹配组件"
        description="换一个组件名、路径或分组关键词继续查找。"
      />
    );
  }

  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between gap-3 py-3 text-sm">
        <span className="text-muted-foreground">
          {hasQuery ? "当前筛选结果" : "当前全量索引"}
        </span>
        <span className="font-mono text-xs text-primary">{fileCount} 个文件</span>
      </div>
      <div className="divide-y divide-border border-t border-border">
        {groups.map((group) => (
          <section key={group.id} className="py-5">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {group.label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {group.description}
                </p>
              </div>
              <StatusToken tone="primary">{group.items.length} 个文件</StatusToken>
            </div>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {group.items.map((item) => (
                <div
                  key={item.file}
                  className="grid gap-3 py-3 text-sm lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)]"
                >
                  <div className="min-w-0">
                    <div className="break-all font-mono text-xs text-primary">
                      {item.file}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.components.length > 0
                        ? `${item.components.length} 个组件名`
                        : "未识别到 PascalCase 组件名"}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {item.components.length > 0 ? (
                      item.components.map((component) => (
                        <StatusToken key={component}>{component}</StatusToken>
                      ))
                    ) : (
                      <StatusToken>文件级组件</StatusToken>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ExamplePanel({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <div className={cn("border border-border bg-surface/40 p-4", className)}>
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3 border-b border-border pb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="font-mono text-[11px] text-muted-foreground">示例</span>
      </div>
      {children}
    </div>
  );
}

function GuidelineCard({
  icon,
  text,
  title,
}: {
  icon: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-md bg-surface px-4 py-4 ring-1 ring-border/60">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
