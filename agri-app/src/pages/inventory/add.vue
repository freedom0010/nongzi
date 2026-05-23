<template>
  <view class="page-container">
    <view class="card">

      <view class="form-item">
        <view class="form-label form-required">条码</view>
        <view class="barcode-row">
          <input v-model="form.barcode" class="input-box" style="flex:1" placeholder="扫码枪扫 或 手动输入" :disabled="!!editId" />
          <button class="btn btn-ghost btn-sm" style="margin-left:12rpx" @tap="scanBarcode">📷</button>
          <button class="btn btn-ghost btn-sm" style="margin-left:12rpx" @tap="genBarcode">生成</button>
        </view>
      </view>

      <view class="form-item">
        <view class="form-label form-required">商品名称</view>
        <input v-model="form.name" class="input-box" placeholder="如：甲维盐水分散粒剂 100g" />
      </view>

      <view class="form-row-2">
        <view class="form-item" style="flex:1">
          <view class="form-label">分类</view>
          <picker :range="categoryNames" @change="onCategoryChange">
            <view class="input-box picker-box">
              {{ categoryNames[categoryIdx] || '请选择' }}
            </view>
          </picker>
        </view>
        <view class="form-item" style="flex:1;margin-left:16rpx">
          <view class="form-label">规格</view>
          <input v-model="form.spec" class="input-box" placeholder="如：50kg/袋" />
        </view>
      </view>

      <view class="form-row-2">
        <view class="form-item" style="flex:1">
          <view class="form-label">单位</view>
          <input v-model="form.unit" class="input-box" placeholder="件/袋/瓶…" />
        </view>
        <view class="form-item" style="flex:1;margin-left:16rpx">
          <view class="form-label">供应商</view>
          <picker :range="supplierNames" @change="onSupplierChange">
            <view class="input-box picker-box">
              {{ supplierNames[supplierIdx] || '请选择' }}
            </view>
          </picker>
        </view>
      </view>

      <view class="form-row-2">
        <view class="form-item" style="flex:1">
          <view class="form-label">进价（元）</view>
          <input v-model.number="form.cost_price" class="input-box" type="digit" placeholder="0.00" />
        </view>
        <view class="form-item" style="flex:1;margin-left:16rpx">
          <view class="form-label">售价（元）</view>
          <input v-model.number="form.sale_price" class="input-box" type="digit" placeholder="0.00" />
        </view>
      </view>

      <view class="form-row-2">
        <view class="form-item" style="flex:1">
          <view class="form-label">{{ editId ? '当前库存' : '初始库存' }}</view>
          <input v-model.number="form.stock" class="input-box" type="number" placeholder="0" :disabled="!!editId" />
        </view>
        <view class="form-item" style="flex:1;margin-left:16rpx">
          <view class="form-label">预警库存</view>
          <input v-model.number="form.warn_stock" class="input-box" type="number" placeholder="10" />
        </view>
      </view>

      <view class="form-item">
        <view class="form-label">效期</view>
        <picker mode="date" :value="form.expire_date" @change="e => form.expire_date = e.detail.value">
          <view class="input-box picker-box">
            {{ form.expire_date || '可选，点击选择' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <view class="form-label">备注</view>
        <textarea v-model="form.remark" class="input-box" style="height:120rpx;font-size:28rpx" placeholder="可选" />
      </view>

    </view>

    <!-- 操作按钮 -->
    <view class="btn-row">
      <button class="btn btn-ghost" style="flex:1" @tap="uni.navigateBack()">取消</button>
      <button class="btn btn-green" style="flex:2;margin-left:16rpx" :loading="saving" @tap="save">
        {{ editId ? '保存修改' : '创建商品' }}
      </button>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { productApi, categoryApi, supplierApi } from '../../api/index.js'

const props  = defineProps(['barcode', 'editId'])  // 通过 query 传入
const saving = ref(false)

// 通过 onLoad 获取页面参数
const editId   = ref('')
const initBarcode = ref('')

const form = reactive({
  barcode: '', name: '', spec: '', unit: '件',
  cost_price: '', sale_price: '', stock: 0, warn_stock: 10,
  category_id: null, supplier_id: null,
  expire_date: '', remark: ''
})

const categories   = ref([])
const suppliers    = ref([])
const categoryIdx  = ref(0)
const supplierIdx  = ref(0)

const categoryNames = computed(() => ['请选择分类', ...categories.value.map(c => c.name)])
const supplierNames = computed(() => ['请选择供应商', ...suppliers.value.map(s => s.name)])

function onCategoryChange(e) {
  const idx = e.detail.value
  categoryIdx.value  = idx
  form.category_id   = idx > 0 ? categories.value[idx-1].id : null
}
function onSupplierChange(e) {
  const idx = e.detail.value
  supplierIdx.value  = idx
  form.supplier_id   = idx > 0 ? suppliers.value[idx-1].id : null
}

function genBarcode() {
  form.barcode = '690' + Date.now().toString().slice(-10)
}

function scanBarcode() {
  // #ifdef APP-PLUS
  plus.barcode.scan(
    (type, result) => { form.barcode = result },
    (err) => uni.showToast({ title: '扫码失败', icon: 'none' }),
    [plus.barcode.EAN13, plus.barcode.EAN8, plus.barcode.CODE128, plus.barcode.CODE39]
  )
  // #endif
  // #ifndef APP-PLUS
  uni.showToast({ title: '请在真机上使用', icon: 'none' })
  // #endif
}

async function save() {
  if (!form.barcode.trim()) return uni.showToast({ title: '请填写条码', icon: 'none' })
  if (!form.name.trim())    return uni.showToast({ title: '请填写商品名称', icon: 'none' })

  saving.value = true
  try {
    if (editId.value) {
      await productApi.update(editId.value, form)
      uni.showToast({ title: '修改成功', icon: 'success' })
    } else {
      await productApi.create(form)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 1200)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  // 获取页面参数
  const pages  = getCurrentPages()
  const cur    = pages[pages.length - 1]
  const opts   = cur?.options || {}
  editId.value      = opts.id || ''
  initBarcode.value = opts.barcode || ''

  // 加载分类和供应商
  const [cats, sups] = await Promise.all([categoryApi.list(), supplierApi.list()])
  categories.value = cats.data || []
  suppliers.value  = sups.data || []

  if (initBarcode.value) form.barcode = initBarcode.value

  // 编辑模式：加载现有数据
  if (editId.value) {
    const { data } = await productApi.getOne(editId.value)
    Object.assign(form, data)
    categoryIdx.value = categories.value.findIndex(c => c.id === data.category_id) + 1
    supplierIdx.value = suppliers.value.findIndex(s => s.id === data.supplier_id) + 1
  }
})
</script>

<style lang="scss">
.barcode-row { display: flex; align-items: center; }
.picker-box  { color: var(--text); }
.form-row-2  { display: flex; }
.btn-row {
  display: flex; padding: 24rpx;
  .btn { height: 96rpx; font-size: 32rpx; }
}
</style>
