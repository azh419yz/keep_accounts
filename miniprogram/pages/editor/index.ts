Page({
    data: {
        billId: '',
        target: ''
    },
    onLoad(options: any) {
        if (options.id) {
            this.setData({ billId: options.id })
        }
        if (options.target) {
            this.setData({ target: options.target })
        }
    }
})
