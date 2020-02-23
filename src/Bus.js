const {systemBus: createSystemBus} = require('dbus-next');

class Bus {
    constructor(dbus, service, object, iface) {
        this.dbus = dbus || createSystemBus();
        this.service = service
        this.object = object
        this.iface = iface

        this._ready = false
        this._objectProxy = null
        this._ifaceProxy = null
        this._propsProxy = null
    }

    async _prepare() {
        if (this._ready) return
        const objectProxy = this._objectProxy = await this.dbus.getProxyObject(this.service, this.object);
        this._ifaceProxy = await objectProxy.getInterface(this.iface)
        this._propsProxy = await objectProxy.getInterface('org.freedesktop.DBus.Properties')
        this._ready = true
    }

    async props() {
        await this._prepare()
        const rawProps = await this._propsProxy.GetAll(this.iface)
        const props = {}
        for (const propKey in rawProps) {
            props[propKey] = rawProps[propKey].value
        }
        return props
    }

    async prop(propName) {
        await this._prepare()
        const rawProp = await this._propsProxy.Get(this.iface, propName)
        return rawProp.value
    }

    async children() {
        await this._prepare()
        return buildChildren(this.object, this._objectProxy.nodes)
    }

    async callMethod(methodName, ...args) {
        await this._prepare()
        const rawRes = await this._ifaceProxy[methodName](...args)
        return rawRes
    }

    async destroy() {
        this.dbus.disconnect()
    }

    derive(object, iface) {
        return new Bus(this.dbus, this.service, object, iface)
    }
}

function buildChildren(path, nodes) {
  if (path === "/") path = ""
  const children = new Set()
  for (const node of nodes) {
    if (!node.startsWith(path)) continue

    const end = node.indexOf('/', path.length + 1)
    const sub = (end >= 0) ? node.substring(path.length + 1, end) : node.substring(path.length + 1)
    if (sub.length < 1) continue

    children.add(sub)
  }
  return Array.from(children.values())
}


module.exports.Bus = Bus
module.exports.buildChildren = buildChildren

