import { View } from "@tarojs/components";
import Taro from "@tarojs/taro"
import { foo } from "./utils"

class Index extends Taro.Component {

  componentDidMount() {
    foo();
  }

  render() {
    return <View>
      index2
    </View>
  }
}

export default Index;