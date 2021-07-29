import { View } from "@tarojs/components";
import { foo } from "../package/utils"
import Taro from "@tarojs/taro"

class Index extends Taro.Component {

  componentDidMount() {
    foo();
  }

  render() {
    return <View>
      index1
    </View>
  }
}

export default Index